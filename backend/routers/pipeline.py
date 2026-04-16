from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.orm import Session
import asyncio
import time
import secrets
import logging
import os
from datetime import datetime, timezone

from database import (
    get_db, Bounty, Submission, Transaction, 
    BountyStatus, SubmissionStatus, TransactionType, TransactionStatus
)
from auth import require_seller, require_auth
from algorand_client import check_algod_connection, mint_mastery_nft
from sandbox import run_in_sandbox
from oracle import cast_release_votes, get_oracle_consensus_status
from security import static_analysis, advisory_audit, multimodal_eval
from models import SubmitWorkRequest, EvaluateScopeRequest
from api.pulse import emit_pulse_event
import test_generator
import ipfs

router = APIRouter(prefix="/pipeline", tags=["Pipeline"])
logger = logging.getLogger("vortex.pipeline")

@router.post("/evaluate-scope")
async def evaluate_scope(req: EvaluateScopeRequest, user: dict = Depends(require_auth)):
    result = await test_generator.evaluate_requirements(req.description, req.verification_criteria)
    return {"success": True, "data": result}

class SummarizeRequest(BaseModel):
    criteria: str

@router.post("/summarize-criteria")
async def summarize_criteria(req: SummarizeRequest, user: dict = Depends(require_auth)):
    result = await test_generator.summarize_criteria(req.criteria)
    return {"success": True, "data": {"summary": result}}

from worker import process_submission_task
from supabase_client import supabase

def _emit(bounty_id: str, event: dict):
    """Emit high-fidelity pulse to Supabase Realtime Edge — per-bounty channel."""
    supabase.broadcast(
        channel=f"verification_{bounty_id}",
        event=event.get("event", "update"),
        payload={"data": event, "bounty_id": bounty_id}
    )

@router.post("/submit/{bounty_id}")
async def submit_work(
    bounty_id: str,
    req: SubmitWorkRequest,
    background_tasks: BackgroundTasks,
    user: dict = Depends(require_seller),
    db: Session = Depends(get_db),
):
    bounty = db.query(Bounty).filter(Bounty.id == bounty_id).first()
    if not bounty:
        raise HTTPException(404, "Bounty not found")
    
    current_status = str(bounty.status.value if hasattr(bounty.status, 'value') else bounty.status).upper()
    if current_status != "ACTIVE":
        raise HTTPException(400, f"Bounty is not active (status: {current_status})")

    submission = Submission(
        bounty_id=bounty_id,
        seller_wallet=user["wallet"],
        artifact_url=req.artifact,
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)

    # Run pipeline in background AFTER HTTP response is sent,
    # so the frontend has time to subscribe to the Supabase channel first.
    from worker import process_submission_task
    background_tasks.add_task(process_submission_task, submission.id, req.artifact)
    
    _emit(bounty_id, {
        "event": "pipeline_started", 
        "step": 0, 
        "status": "running",
        "message": "Sovereign Audit Initiated. Monitoring high-fidelity verification layers..."
    })

    return {
        "success": True, 
        "data": {
            "submission_id": submission.id,
            "status": "processing"
        }
    }


@router.get("/submissions/detail/{submission_id}")
async def get_submission_detail(submission_id: str, db: Session = Depends(get_db)):
    s = db.query(Submission).filter(Submission.id == submission_id).first()
    if not s:
        raise HTTPException(404, "Submission not found")
        
    return {
        "success": True,
        "data": {
            "id": s.id,
            "bounty_id": s.bounty_id,
            "seller_wallet": s.seller_wallet,
            "status": str(s.status.value if hasattr(s.status, 'value') else s.status).lower(),
            "submitted_at": s.submitted_at.isoformat() if s.submitted_at else None,
            "verification_step": getattr(s, 'verification_step', 0) or 0,
            "static_passed": getattr(s, 'static_passed', None),
            "sandbox_passed": getattr(s, 'sandbox_passed', None),
            "jury_passed": getattr(s, 'jury_passed', None),
            "last_error": getattr(s, 'last_error', None),
            "static_logs": s.static_logs,
            "sandbox_logs": s.sandbox_logs,
            "jury_logs": s.jury_logs,
            "tx_id": s.tx_id,
            "settlement_time": s.settlement_time,
            "nft_id": s.nft_id,
            "nft_asset_url": s.nft_asset_url
        }
    }

@router.get("/submissions/{bounty_id}")
async def get_submissions(bounty_id: str, db: Session = Depends(get_db)):
    subs = db.query(Submission).filter(Submission.bounty_id == bounty_id).all()
    items = [{
        "id": s.id, "seller_wallet": s.seller_wallet, 
        "status": str(s.status.value if hasattr(s.status, 'value') else s.status).lower(),
        "submitted_at": s.submitted_at.isoformat() if s.submitted_at else None,
        "tx_id": s.tx_id, "settlement_time": s.settlement_time,
        "static_passed": s.static_passed, "sandbox_passed": s.sandbox_passed, "jury_passed": s.jury_passed
    } for s in subs]
    return {"success": True, "data": {"submissions": items}}

@router.post("/submissions/{submission_id}/forensics")
async def generate_forensics(submission_id: str, db: Session = Depends(get_db)):
    sub = db.query(Submission).filter(Submission.id == submission_id).first()
    if not sub: raise HTTPException(404, "Submission not found")
    current_status = str(sub.status.value if hasattr(sub.status, 'value') else sub.status).upper()
    if current_status == "PASSED":
        return {"success": True, "data": {"summary": "Submission verified. No forensics needed."}}

    bounty = sub.bounty
    # We need the code and the tests. In this MVP, code is stored as artifact_url (plain text or IPFS).
    # Assuming artifact_url is the plain code for now (Demo mode)
    report = await test_generator.analyze_failure(
        code=sub.artifact_url,
        tests=bounty.verification_criteria or "",
        logs=str(sub.sandbox_logs or "No execution logs found.")
    )
    sub.forensic_report = report
    db.commit()
    return {"success": True, "data": report}


@router.get("/mine")
async def my_submissions(user: dict = Depends(require_seller), db: Session = Depends(get_db)):
    subs = db.query(Submission).filter(Submission.seller_wallet == user["wallet"])\
           .order_by(Submission.submitted_at.desc()).all()
    items = []
    for s in subs:
        b = s.bounty
        items.append({
            "id": s.id, 
            "bounty_id": s.bounty_id, 
            "bounty_title": b.title if b else "Unknown Bounty",
            "reward_algo": float(b.reward_algo) if b else 0,
            "status": str(s.status.value if hasattr(s.status, 'value') else s.status).lower(),
            "submitted_at": s.submitted_at.isoformat() if s.submitted_at else None,
            "tx_id": s.tx_id
        })
    return {"success": True, "data": {"submissions": items}}

from pydantic import BaseModel

class DryRunRequest(BaseModel):
    artifact: str
    verification_criteria: str

@router.post("/dry-run")
async def execute_dry_run(req: DryRunRequest, user: dict = Depends(require_seller)):
    """Executes the Solver Sandbox locally without initiating an on-chain submission."""
    start = time.time()
    
    # 1. Static AST pass
    static_result = await asyncio.to_thread(static_analysis, req.artifact)
    if not static_result["pass"]:
        return {"success": False, "status": "failed", "step": "Static Analysis", "logs": static_result.get("logs", [])}
        
    # 2. Docker Sandbox pass
    sandbox_result = await asyncio.to_thread(run_in_sandbox, req.artifact, req.verification_criteria)
    
    elapsed = round(time.time() - start, 2)
    return {
        "success": True, 
        "data": {
            "status": "passed" if sandbox_result["pass"] else "failed",
            "step": "Isolated Execution",
            "logs": sandbox_result.get("logs", []),
            "time": elapsed
        }
    }
