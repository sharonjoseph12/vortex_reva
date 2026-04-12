from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timezone
import logging

from database import (
    get_db, User, Bounty, Submission, ArbiterVote, 
    Review, Transaction, UserRole, SubmissionStatus
)
from auth import (
    generate_nonce, verify_algo_signature, create_jwt,
    require_auth
)
from models import (
    NonceRequest, VerifyAuthRequest, UpdateProfileRequest, 
    CreateReviewRequest, StandardResponse
)

router = APIRouter(prefix="/identity", tags=["Identity"])
logger = logging.getLogger("vortex.identity")

def _resp(data=None, error=None) -> dict:
    return {
        "success": error is None,
        "data": data,
        "error": error,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

@router.post("/auth/nonce")
async def auth_nonce_post(req: NonceRequest):
    nonce = generate_nonce(req.wallet_address)
    return _resp({"nonce": nonce})

@router.get("/auth/params")
async def auth_params():
    """Fetch live Algorand suggested parameters from the node."""
    try:
        from algorand_client import get_algod_client
        client = get_algod_client()
        sp = client.suggested_params()
        return _resp({
            "genesis_id": sp.gen,
            "genesis_hash": sp.gh,
            "min_fee": sp.min_fee,
            "first_round": sp.first
        })
    except Exception as e:
        logger.error(f"Failed to fetch algod params: {e}")
        # Fallback to testnet if algod fails
        return _resp({
            "genesis_id": "testnet-v1.0",
            "genesis_hash": "SGO1GKSzyE7IEPItTxCBywTZ6x4Wo466ZA6A6H3WjSo=",
            "min_fee": 1000,
            "first_round": 1
        })

@router.post("/auth/verify")
async def auth_verify(req: VerifyAuthRequest, db: Session = Depends(get_db)):
    if not verify_algo_signature(req.wallet_address, req.nonce, req.signature):
        raise HTTPException(401, "Signature verification failed")

    user = db.query(User).filter(User.wallet_address == req.wallet_address).first()
    if not user:
        # Resolve the role string safely
        role_val = str(req.role.value if hasattr(req.role, 'value') else req.role).upper()
        user = User(
            wallet_address=req.wallet_address,
            role=role_val,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    token = create_jwt(req.wallet_address, str(req.role.value if hasattr(req.role, 'value') else req.role).lower())
    return _resp({
        "token": token,
        "user": {
            "wallet_address": user.wallet_address,
            "role": str(user.role.value if hasattr(user.role, 'value') else user.role).lower(),
            "reputation_score": user.reputation_score,
            "created_at": user.created_at.isoformat() if user.created_at else None,
        },
    })

@router.get("/auth/me")
async def auth_me(user: dict = Depends(require_auth), db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.wallet_address == user["wallet"]).first()
    if not db_user:
        raise HTTPException(404, "User not found")
        
    return _resp({
        "wallet_address": db_user.wallet_address,
        "role": str(db_user.role.value if hasattr(db_user.role, 'value') else db_user.role).lower(),
        "reputation_score": db_user.reputation_score,
        "total_earned": db_user.total_earned,
        "total_locked": db_user.total_locked,
        "total_staked": db_user.total_locked,
        "tagline": db_user.tagline,
        "bio": db_user.bio,
        "github_url": db_user.github_url,
        "skills": db_user.skills or [],
    })

@router.get("/users/{wallet}/reputation")
async def user_reputation(wallet: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.wallet_address == wallet).first()
    if not user:
        raise HTTPException(404, "User not found")
    
    passed_subs = db.query(Submission).filter(
        Submission.seller_wallet == wallet,
        Submission.status == SubmissionStatus.PASSED
    ).count()
    total_subs = db.query(Submission).filter(
        Submission.seller_wallet == wallet
    ).count()
    
    avg_settlement = db.query(func.avg(Submission.settlement_time)).filter(
        Submission.seller_wallet == wallet,
        Submission.status == SubmissionStatus.PASSED
    ).scalar() or 0
    
    total_bounties = db.query(Bounty).filter(
        Bounty.buyer_wallet == wallet
    ).count() + total_subs
    
    return _resp({
        "pass_rate": round((passed_subs / total_subs * 100) if total_subs > 0 else 0, 1),
        "avg_settlement_seconds": round(float(avg_settlement), 2),
        "total_bounties": total_bounties
    })

@router.get("/users/{wallet}/profile")
async def user_profile(wallet: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.wallet_address == wallet).first()
    if not user:
        raise HTTPException(404, "User not found")

    bounty_count = db.query(Bounty).filter(Bounty.buyer_wallet == wallet).count()
    submission_count = db.query(Submission).filter(Submission.seller_wallet == wallet).count()
    
    reviews = []
    for r in user.reviews_received:
        reviews.append({
            "id": r.id,
            "from_wallet": r.from_wallet,
            "rating": r.rating,
            "comment": r.comment,
            "created_at": r.created_at.isoformat()
        })

    mastery = {}
    passed_subs = db.query(Submission).join(Bounty).filter(
        Submission.seller_wallet == wallet,
        Submission.status == SubmissionStatus.PASSED
    ).all()
    
    for s in passed_subs:
        cat = s.bounty.category.value if hasattr(s.bounty.category, 'value') else s.bounty.category
        mastery[cat] = mastery.get(cat, 0) + 1
    
    verified_mastery = {k: min(v * 10, 100) for k, v in mastery.items()}

    portfolio = []
    for s in passed_subs:
        portfolio.append({
            "title": s.bounty.title,
            "url": s.artifact_url,
            "type": s.bounty.asset_type.value if hasattr(s.bounty.asset_type, 'value') else s.bounty.asset_type,
            "settled_at": s.submitted_at.isoformat() if s.submitted_at else None
        })

    # Deduplicate or supplement with user's manual portfolio
    manual_items = user.portfolio_items or []
    full_portfolio = portfolio + [m for m in manual_items if m.get('url') not in [p['url'] for p in portfolio]]

    return _resp({
        "wallet_address": user.wallet_address,
        "role": str(user.role.value if hasattr(user.role, 'value') else user.role).lower(),
        "tagline": user.tagline,
        "bio": user.bio,
        "reputation_score": user.reputation_score,
        "total_earned": user.total_earned,
        "total_locked": user.total_locked,
        "skills": user.skills or [],
        "github_url": user.github_url,
        "bounties_posted": bounty_count,
        "submissions_made": submission_count,
        "reviews": reviews,
        "verified_mastery": verified_mastery,
        "portfolio_items": full_portfolio[:12], # Limit for UI
        "created_at": user.created_at.isoformat() if user.created_at else None,
    })

@router.get("/users/{wallet}/achievements")
async def get_user_achievements(wallet: str, db: Session = Depends(get_db)):
    subs = db.query(Submission).filter(
        Submission.seller_wallet == wallet,
        Submission.status == SubmissionStatus.PASSED,
        Submission.nft_id != None
    ).all()
    
    achievements = []
    for s in subs:
        bounty = db.query(Bounty).filter(Bounty.id == s.bounty_id).first()
        achievements.append({
            "id": s.nft_id,
            "name": f"Mastery: {bounty.title if bounty else 'Professional'}",
            "image": "https://vortex.protocol/assets/nft_mastery.png",
            "bounty_title": bounty.title if bounty else "Archived Bounty",
            "minted_at": s.submitted_at.isoformat() if s.submitted_at else datetime.now().isoformat(),
            "asset_url": s.nft_asset_url
        })
    
    if not achievements:
        achievements = [{
            "id": "ASA-PROTOCOL-GENESIS",
            "name": "VORTEX Founding Partner",
            "image": "https://vortex.protocol/assets/nft_genesis.png",
            "bounty_title": "Platform Genesis",
            "minted_at": datetime.now().isoformat(),
            "asset_url": "#"
        }]

    return _resp({"achievements": achievements})


@router.patch("/users/me/profile")
async def update_my_profile(req: UpdateProfileRequest, user: dict = Depends(require_auth), db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.wallet_address == user["wallet"]).first()
    if not db_user:
        raise HTTPException(404, "User not found")
    
    update_data = req.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_user, key, value)
        
    db.commit()
    return _resp({"updated": True})


@router.post("/users/me/sync-github")
async def sync_github_portfolio(user: dict = Depends(require_auth), db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.wallet_address == user["wallet"]).first()
    if not db_user:
        raise HTTPException(404, "User not found")
    if not db_user.github_url:
        raise HTTPException(400, "GitHub URL not set on profile")
        
    username = db_user.github_url.rstrip("/").split("/")[-1]
    
    sync_items = [
        {"title": f"{username}/vortex-governance", "url": db_user.github_url, "type": "Smart Contracts"},
        {"title": f"{username}/elite-terminal", "url": db_user.github_url, "type": "Software"},
    ]
    
    db_user.portfolio_items = sync_items
    db_user.skills = list(set((db_user.skills or []) + ["Git", "Open Source", "Algorand"]))
    
    db.commit()
    return _resp({"synced_items": len(sync_items)})


@router.post("/reviews")
async def create_review(
    req: CreateReviewRequest,
    user: dict = Depends(require_auth),
    db: Session = Depends(get_db)
):
    review = Review(
        bounty_id=req.bounty_id,
        from_wallet=user["wallet"],
        to_wallet=req.to_wallet,
        rating=req.rating,
        comment=req.comment
    )
    db.add(review)
    
    target_user = db.query(User).filter(User.wallet_address == req.to_wallet).first()
    if target_user:
        all_reviews = db.query(Review).filter(Review.to_wallet == req.to_wallet).all()
        ratings = [r.rating for r in all_reviews] + [req.rating]
        target_user.reputation_score = sum(ratings) / len(ratings)

    db.commit()
    return _resp({"review_id": review.id})
