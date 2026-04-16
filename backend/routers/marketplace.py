from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
import os
from datetime import datetime, timezone

from database import get_db, Bounty, Submission, BountyStatus
from auth import require_buyer
from models import (
    CreateBountyRequest, GenerateTestsRequest, RefineScopeRequest
)
from test_generator import generate_unit_tests, refine_requirements

router = APIRouter(prefix="/marketplace", tags=["Marketplace"])

def _resp(data=None, error=None) -> dict:
    return {
        "success": error is None,
        "data": data,
        "error": error,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

@router.post("/bounties")
async def create_bounty(req: CreateBountyRequest, user: dict = Depends(require_buyer), db: Session = Depends(get_db)):
    bounty = Bounty(
        title=req.title,
        description=req.description,
        requirements=req.requirements,
        verification_criteria=req.verification_criteria,
        asset_type=str(req.asset_type.value if hasattr(req.asset_type, 'value') else req.asset_type).upper(),
        reward_algo=req.reward_algo,
        buyer_wallet=user["wallet"],
        deadline=req.deadline,
        difficulty=str(req.difficulty.value if hasattr(req.difficulty, 'value') else req.difficulty).upper(),
        category=str(req.category.value if hasattr(req.category, 'value') else req.category).upper(),
        app_id=req.app_id or int(os.getenv("APP_ID", "1001")),
        status=BountyStatus.ACTIVE,
    )
    db.add(bounty)
    db.commit()
    db.refresh(bounty)
    return _resp({"bounty_id": bounty.id, "app_id": bounty.app_id})

@router.get("/bounties")
async def list_bounties(
    status: Optional[str] = None,
    difficulty: Optional[str] = None,
    category: Optional[str] = None,
    buyer: Optional[str] = None,
    sort: str = "newest",
    limit: int = Query(20, le=100),
    offset: int = 0,
    db: Session = Depends(get_db),
):
    q = db.query(Bounty)
    if status: q = q.filter(Bounty.status == status.upper())
    if difficulty: q = q.filter(Bounty.difficulty == difficulty.upper())
    if category: q = q.filter(Bounty.category == category.upper())
    if buyer: q = q.filter(Bounty.buyer_wallet == buyer)

    if sort == "reward": q = q.order_by(Bounty.reward_algo.desc())
    elif sort == "deadline": q = q.order_by(Bounty.deadline.asc())
    else: q = q.order_by(Bounty.created_at.desc())

    total = q.count()
    bounties = q.offset(offset).limit(limit).all()

    items = []
    for b in bounties:
        sub_count = db.query(Submission).filter(Submission.bounty_id == b.id).count()
        items.append({
            "id": b.id, "title": b.title, "description": b.description[:200],
            "reward_algo": b.reward_algo, 
            "status": str(b.status.value if hasattr(b.status, 'value') else b.status).lower(),
            "category": str(b.category.value if hasattr(b.category, 'value') else b.category).lower(),
            "buyer_wallet": b.buyer_wallet,
            "deadline": b.deadline.isoformat() if b.deadline else None,
            "submission_count": sub_count,
        })

    return _resp({"bounties": items, "total": total})

@router.get("/bounties/{bounty_id}")
async def get_bounty(bounty_id: str, db: Session = Depends(get_db)):
    bounty = db.query(Bounty).filter(Bounty.id == bounty_id).first()
    if not bounty:
        raise HTTPException(404, "Bounty not found")
    sub_count = db.query(Submission).filter(Submission.bounty_id == bounty_id).count()
    return _resp({
        "id": bounty.id, "title": bounty.title, "description": bounty.description,
        "requirements": bounty.requirements,
        "verification_criteria": bounty.verification_criteria,
        "reward_algo": bounty.reward_algo,
        "app_id": bounty.app_id,
        "status": str(bounty.status.value if hasattr(bounty.status, 'value') else bounty.status).lower(),
        "difficulty": str(bounty.difficulty.value if hasattr(bounty.difficulty, 'value') else bounty.difficulty).lower(),
        "category": str(bounty.category.value if hasattr(bounty.category, 'value') else bounty.category).lower(),
        "asset_type": str(bounty.asset_type.value if hasattr(bounty.asset_type, 'value') else bounty.asset_type).lower(),
        "buyer_wallet": bounty.buyer_wallet,
        "deadline": bounty.deadline.isoformat() if bounty.deadline else None,
        "submission_count": sub_count,
        "created_at": bounty.created_at.isoformat() if bounty.created_at else None,
    })

@router.post("/generate-tests")
async def generate_tests(req: GenerateTestsRequest, user: dict = Depends(require_buyer)):
    result = await generate_unit_tests(req.prompt, req.category)
    return _resp(result)

@router.post("/refine-scope")
async def refine_scope(req: RefineScopeRequest, user: dict = Depends(require_buyer)):
    result = await refine_requirements(req.description, req.requirements)
    return _resp(result)

@router.get("/{bounty_id}/receipt")
async def get_fiscal_receipt(bounty_id: str, db: Session = Depends(get_db)):
    bounty = db.query(Bounty).filter(Bounty.id == bounty_id).first()
    if not bounty or bounty.status != BountyStatus.SETTLED:
        raise HTTPException(404, "Settled bounty not found")
        
    fiscal_payload = f"{bounty.id}|{bounty.tx_id}|{bounty.reward_algo}|{bounty.settled_at}"
    dummy_signature = f"VRTX-ORC-SIG-4.0"

    return _resp({
        "bounty_id": bounty.id,
        "tx_id": bounty.tx_id,
        "amount_algo": float(bounty.reward_algo),
        "buyer": bounty.buyer_wallet,
        "seller": bounty.developer_wallet,
        "settled_at": bounty.settled_at.isoformat() if bounty.settled_at else None,
        "oracle_signature": dummy_signature,
        "fiscal_hash": f"sha256:MODULAR-{hash(fiscal_payload)}"
    })
@router.delete("/bounties/{bounty_id}")
async def delete_bounty(bounty_id: str, user: dict = Depends(require_buyer), db: Session = Depends(get_db)):
    bounty = db.query(Bounty).filter(Bounty.id == bounty_id, Bounty.buyer_wallet == user["wallet"]).first()
    if not bounty:
        raise HTTPException(404, "Bounty not found")
    subs = db.query(Submission).filter(Submission.bounty_id == bounty_id).count()
    if subs > 0:
        raise HTTPException(400, "Cannot delete bounty with existing submissions")
    db.delete(bounty)
    db.commit()
    return _resp({"deleted": True})
