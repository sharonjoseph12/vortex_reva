from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sse_starlette.sse import EventSourceResponse
import asyncio
import json
import time
import secrets
import logging
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

# SSE event queues managed within this router
_verification_queues: dict[str, asyncio.Queue] = {}

def _emit(bounty_id: str, event: dict):
    q = _verification_queues.get(bounty_id)
    if q:
        q.put_nowait(event)

@router.post("/submit/{bounty_id}")
async def submit_work(
    bounty_id: str,
    req: SubmitWorkRequest,
    user: dict = Depends(require_seller),
    db: Session = Depends(get_db),
):
    sandbox_result = None
    jury_result = None
    start_time = time.time()
    bounty = db.query(Bounty).filter(Bounty.id == bounty_id).first()
    if not bounty:
        raise HTTPException(404, "Bounty not found")
    if bounty.status != BountyStatus.ACTIVE:
        raise HTTPException(400, "Bounty is not active")

    submission = Submission(
        bounty_id=bounty_id,
        seller_wallet=user["wallet"],
        artifact_url=req.artifact,
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)

    _verification_queues[bounty_id] = asyncio.Queue()

    # --- Start Pipeline (Blocking for now, but emitting events) ---
    # In a full PRO version, this would be a background task
    
    # Layer 1: Static Analysis
    asset_type_str = str(bounty.asset_type.value if hasattr(bounty.asset_type, 'value') else bounty.asset_type)
    print(f"[VORTEX-PIPELINE] Processing Bounty: {bounty_id}, AssetType: {asset_type_str}")
    
    if asset_type_str == "code":
        static_result = static_analysis(req.artifact)
    else:
        static_result = {
            "pass": True, 
            "message": "Protocol: Static Analysis Not Applicable for non-code assets",
            "logs": ["> Skipping AST Analysis: Target is design/document artifact"]
        }

    submission.static_passed = static_result["pass"]
    _emit(bounty_id, {
        "event": "static_result", 
        "step": 1, 
        "status": "pass" if static_result["pass"] else "fail",
        "message": static_result.get("message", "Logic discordance check completed") if static_result["pass"] else "Static analysis failed",
        "logs": static_result.get("logs", [])
    })
    
    if not static_result["pass"]:
        submission.status = SubmissionStatus.FAILED
        db.commit()
        return {"success": False, "error": "Static analysis failed"}

    # Layer 2: Sandbox (Code only)
    if asset_type_str == "code":
        sandbox_result = run_in_sandbox(req.artifact, bounty.verification_criteria)
        print(f"[SANDBOX-DEBUG] pass={sandbox_result['pass']}, docker_error={sandbox_result.get('docker_error')}, timeout={sandbox_result.get('timeout')}")
        print(f"[SANDBOX-DEBUG] FULL LOGS:\n{sandbox_result.get('logs', '')}")
        submission.sandbox_passed = sandbox_result["pass"]
        _emit(bounty_id, {
            "event": "sandbox_result", 
            "step": 2, 
            "status": "pass" if sandbox_result["pass"] else "fail",
            "message": "Isolated execution successful" if sandbox_result["pass"] else "Sandbox integrity breach",
            "logs": sandbox_result.get("logs", [])
        })
        if not sandbox_result["pass"]:
             submission.status = SubmissionStatus.FAILED
             db.commit()
             return {"success": False, "error": "Sandbox failed"}
    
    # Layer 3: AI Jury (Multi-Modal)
    if asset_type_str in ["media", "document"]:
        jury_result = await multimodal_eval(
            asset_type=asset_type_str, 
            content=req.artifact, 
            criteria=bounty.verification_criteria
        )
        submission.jury_passed = jury_result["pass"]
        message = jury_result["feedback"]
        logs = [f"> Vision Verdict: {'PASS' if jury_result['pass'] else 'FAIL'}", f"> Score: {jury_result['score']}/100"]
        if jury_result.get("flags"):
             logs.extend([f"! {f['type'].upper()}: {f['message']}" for f in jury_result["flags"]])
    else:
        # Code Advisory Audit
        advisory = await advisory_audit(req.artifact, bounty.requirements)
        submission.jury_passed = advisory["advisory_verdict"] != "unsafe"
        message = "AI Advisory consensus reached"
        logs = [f"> Verdict: {advisory['advisory_verdict']}", f"> Reason: {advisory.get('reason', 'Consensus achieved')}"]

    _emit(bounty_id, {
        "event": "jury_result", 
        "step": 3, 
        "status": "pass" if submission.jury_passed else "fail",
        "message": message,
        "logs": logs
    })

    if not submission.jury_passed:
         submission.status = SubmissionStatus.FAILED
         db.commit()
         is_rate_limit = jury_result.get("is_rate_limit") if jury_result else False
         error_kind = "AI Service Error (Rate Limit)" if is_rate_limit else "AI Jury Rejection"
         return {"success": False, "error": f"{error_kind}: {message}"}

    # Finalize Settlement
    elapsed = round(time.time() - start_time, 2)
    submission.status = SubmissionStatus.PASSED
    submission.settlement_time = elapsed
    
    bounty.status = BountyStatus.SETTLED
    bounty.developer_wallet = user["wallet"]
    bounty.settled_at = datetime.now(timezone.utc)
    
    # Layer 4: Oracle Settlement (On-Chain)
    settlement_txs = []
    if bounty.app_id:
        try:
            _emit(bounty_id, {
                "event": "oracle_voting", 
                "step": 4, 
                "status": "running", 
                "message": "Oracles reached consensus. Executing Algorand release..."
            })
            settlement_txs = await cast_release_votes(bounty.app_id, bounty_id)
            submission.tx_id = settlement_txs[-1] # The triggering TX
        except Exception as e:
            logger.error(f"On-chain settlement failed: {e}")
            _emit(bounty_id, {"event": "pipeline_error", "message": f"Oracle release failure: {str(e)}"})

    # Layer 5: Professional Mastery NFT & IPFS Pinning
    try:
        ipfs_cid = ipfs.generate_ipfs_cid(req.artifact)
        nft_result = mint_mastery_nft(
            solver_address=user["wallet"],
            bounty_title=bounty.title,
            ipfs_cid=ipfs_cid
        )
        submission.nft_id = str(nft_result["asset_id"])
        submission.nft_asset_url = f"https://testnet.algoexplorer.io/asset/{nft_result['asset_id']}"
    except Exception as e:
        logger.error(f"NFT Minting failed: {e}")

    db.commit()

    _emit(bounty_id, {
        "event": "settlement_complete", 
        "step": 4, 
        "status": "pass",
        "message": "Oracle release confirmed. Mastery NFT Minted.",
        "logs": [
            "> Settlement complete", 
            f"> Time: {elapsed}s",
            f"> On-Chain Release: {settlement_txs[-1] if settlement_txs else 'Local Registry Only'}",
            f"> Credential Issued: {submission.nft_id if submission.nft_id else 'None'}"
        ],
        "data": {
            "reward": float(bounty.reward_algo), 
            "settlement_time": elapsed,
            "nft_id": submission.nft_id,
            "tx_id": submission.tx_id
        }
    })

    return {
        "success": True, 
        "data": {
            "settlement_time_seconds": elapsed, 
            "tests_passed": sandbox_result["tests_passed"] if sandbox_result else 0, 
            "nft_id": submission.nft_id,
            "tx_id": submission.tx_id
        }
    }

@router.get("/stream/{bounty_id}")
async def verification_stream(bounty_id: str):
    queue = _verification_queues.get(bounty_id)
    if not queue:
        queue = asyncio.Queue()
        _verification_queues[bounty_id] = queue

    async def event_generator():
        try:
            while True:
                event = await asyncio.wait_for(queue.get(), timeout=120)
                yield {
                    "event": event.get("event", "update"),
                    "data": json.dumps(event),
                }
                if event.get("event") in ("settlement_complete", "pipeline_error"):
                    break
        except asyncio.TimeoutError:
            yield {"event": "ping", "data": "{}"}
        finally:
            _verification_queues.pop(bounty_id, None)

    return EventSourceResponse(event_generator())

@router.get("/submissions/{bounty_id}")
async def get_submissions(bounty_id: str, db: Session = Depends(get_db)):
    subs = db.query(Submission).filter(Submission.bounty_id == bounty_id).all()
    items = [{
        "id": s.id, "seller_wallet": s.seller_wallet, "status": s.status.value,
        "submitted_at": s.submitted_at.isoformat() if s.submitted_at else None,
        "tx_id": s.tx_id, "settlement_time": s.settlement_time,
        "static_passed": s.static_passed, "sandbox_passed": s.sandbox_passed, "jury_passed": s.jury_passed
    } for s in subs]
    return {"success": True, "data": {"submissions": items}}

@router.post("/submissions/{submission_id}/forensics")
async def generate_forensics(submission_id: str, db: Session = Depends(get_db)):
    sub = db.query(Submission).filter(Submission.id == submission_id).first()
    if not sub: raise HTTPException(404, "Submission not found")
    if sub.status == SubmissionStatus.PASSED:
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
            "status": s.status.value,
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
    static_result = static_analysis(req.artifact)
    if not static_result["pass"]:
        return {"success": False, "status": "failed", "step": "Static Analysis", "logs": static_result.get("logs", [])}
        
    # 2. Docker Sandbox pass
    sandbox_result = run_in_sandbox(req.artifact, req.verification_criteria)
    
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
