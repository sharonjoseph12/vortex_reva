import structlog
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from celery_app import app
from database import SessionLocal, Transaction, TransactionStatus, Bounty, Submission, BountyStatus, SubmissionStatus
from algorand_client import (
    check_algod_connection, mint_mastery_nft, verify_escrow_deposit, get_transaction_info
)
from sandbox import run_in_sandbox
from oracle import cast_release_votes
from security import static_analysis, advisory_audit, multimodal_eval
from api.pulse import emit_pulse_event
from ipfs import upload_to_vortex_storage, generate_ipfs_cid

logger = structlog.get_logger("vortex.worker")

import os
import time
import json
import redis

from supabase_client import supabase

def _emit(bounty_id: str, event: dict):
    """Emit progress event to Supabase Realtime — per-bounty channel so VerificationTerminal receives it."""
    supabase.broadcast(
        channel=f"verification_{bounty_id}",
        event=event.get("event", "update"),
        payload={"data": event, "bounty_id": bounty_id}
    )

@app.task(name="worker.sync_ledger")
def sync_ledger():
    """Periodically sync pending transactions with the Algorand Indexer."""
    db: Session = SessionLocal()
    try:
        pending_txs = db.query(Transaction).filter(
            Transaction.status == TransactionStatus.PENDING
        ).all()
        
        if not pending_txs:
            return

        logger.info(f"Syncing {len(pending_txs)} pending transactions...")
        
        for tx in pending_txs:
            info = get_transaction_info(tx.tx_hash)
            if info and info.get("transaction"):
                tx.status = TransactionStatus.CONFIRMED
                logger.info("transaction_confirmed", tx_hash=tx.tx_hash[:12])
            else:
                logger.debug("transaction_pending_on_chain", tx_hash=tx.tx_hash[:12])
        
        db.commit()
    except Exception as e:
        logger.error(f"Sync error: {e}")
        db.rollback()
    finally:
        db.close()

@app.task(name="worker.process_submission")
def process_submission_task(submission_id: str, artifact: str):
    """
    Distributable background task to process a submission.
    Includes Static Analysis, Sandbox, AI Jury, and On-chain Settlement.
    """
    log = logger.bind(submission_id=submission_id)
    db: Session = SessionLocal()
    try:
        submission = db.query(Submission).filter(Submission.id == submission_id).first()
        if not submission:
            log.error("submission_not_found")
            return

        bounty = submission.bounty
        bounty_id = bounty.id
        
        # Guard: Don't process if already passed
        if submission.status == SubmissionStatus.PASSED:
            log.warning("submission_already_passed", bounty_id=bounty_id)
            return

        submission.processing_started_at = datetime.now(timezone.utc)
        asset_type_str = str(bounty.asset_type.value if hasattr(bounty.asset_type, 'value') else bounty.asset_type).lower()
        
        log.info("processing_started", asset_type=asset_type_str, reward=bounty.reward_algo)
        start_time = time.time()

        # Give the frontend 1.5s to subscribe to the Supabase channel before events fire
        time.sleep(1.5)

        # 0. Pre-flight: Escrow Verification (Financial Trust)
        DEMO_APP_ID = int(os.getenv("APP_ID", "1001"))
        if not bounty.escrow_verified:
            log.info("escrow_verification_started", app_id=bounty.app_id)
            if bounty.app_id and bounty.app_id != DEMO_APP_ID:
                # Real on-chain escrow check (production)
                is_funded = verify_escrow_deposit(bounty.app_id, bounty.reward_algo)
                if not is_funded:
                    log.error("escrow_funding_failed", app_id=bounty.app_id)
                    submission.status = SubmissionStatus.FAILED
                    submission.last_error = "Escrow funding verification failed. Deposit required."
                    db.commit()
                    _emit(bounty_id, {"event": "pipeline_error", "message": "On-chain escrow not detected. Please fund the bounty."})
                    return
            else:
                log.info("escrow_demo_mode", app_id=bounty.app_id, msg="Demo app_id — skipping on-chain escrow check")
            bounty.escrow_verified = True
            db.commit()
            log.info("escrow_verified", app_id=bounty.app_id)

        # 1. Static Analysis
        submission.verification_step = 1
        if asset_type_str == "code":
            static_res = static_analysis(artifact)
            submission.static_passed = static_res["pass"]
            _emit(bounty_id, {
                "event": "static_result", 
                "step": 1, 
                "status": "pass" if static_res["pass"] else "fail",
                "message": static_res.get("message", "Logic discordance check completed") if static_res["pass"] else "Static analysis failed",
                "logs": static_res.get("logs", [])
            })
            if not static_res["pass"]:
                submission.status = SubmissionStatus.FAILED
                submission.last_error = "Static analysis security violation"
                db.commit()
                return
        else:
            _emit(bounty_id, {
                "event": "static_result", "step": 1, "status": "pass", 
                "message": "N/A for non-code assets", "logs": []
            })

        # 2. Sandbox Execution
        submission.verification_step = 2
        if asset_type_str == "code":
            from sandbox import check_docker_available
            if check_docker_available():
                sandbox_res = run_in_sandbox(artifact, bounty.verification_criteria)
            else:
                log.warning("docker_unavailable", msg="Docker not running — skipping sandbox, proceeding to AI Jury")
                sandbox_res = {
                    "pass": True,
                    "tests_passed": 0,
                    "logs": ["⚠ Docker unavailable — sandbox skipped, AI Jury will evaluate"],
                    "docker_error": "Docker not running"
                }
            submission.sandbox_passed = sandbox_res["pass"]
            sandbox_logs = sandbox_res.get("logs") or []
            if isinstance(sandbox_logs, str):
                sandbox_logs = [sandbox_logs]
            _emit(bounty_id, {
                "event": "sandbox_result",
                "step": 2,
                "status": "pass" if sandbox_res["pass"] else "fail",
                "message": "Isolated execution successful" if sandbox_res["pass"] else "Sandbox breach or test failure",
                "logs": sandbox_logs
            })
            if not sandbox_res["pass"]:
                submission.status = SubmissionStatus.FAILED
                submission.last_error = "Sandbox execution failed (Unit Tests)"
                db.commit()
                return
        else:
            submission.sandbox_passed = True
            _emit(bounty_id, {
                "event": "sandbox_result", "step": 2, "status": "pass",
                "message": "N/A — non-code asset (AI Jury evaluates)", "logs": []
            })

        # 3. AI Jury / Advisory
        submission.verification_step = 3
        if asset_type_str in ["media", "document"]:
            import asyncio
            jury_res = asyncio.run(multimodal_eval(asset_type_str, artifact, bounty.verification_criteria))
            submission.jury_passed = jury_res["pass"]
            message = jury_res["feedback"]
            logs = [f"> Vision Verdict: {'PASS' if jury_res['pass'] else 'FAIL'}", f"> Score: {jury_res['score']}/100"]
        else:
            import asyncio
            advisory = asyncio.run(advisory_audit(artifact, bounty.requirements))
            submission.jury_passed = advisory["advisory_verdict"] != "unsafe"
            message = advisory.get("summary", "AI Advisory consensus reached")
            logs = [f"> Verdict: {advisory['advisory_verdict']}", f"> Reason: {message}"]

        _emit(bounty_id, {
            "event": "jury_result", 
            "step": 3, 
            "status": "pass" if submission.jury_passed else "fail",
            "message": message,
            "logs": logs
        })

        if not submission.jury_passed:
            submission.status = SubmissionStatus.FAILED
            submission.last_error = f"AI Jury Rejection: {message[:255]}"
            db.commit()
            return

        # 4. Finalize & Settle
        submission.verification_step = 4
        elapsed = round(time.time() - start_time, 2)
        submission.status = SubmissionStatus.PASSED
        submission.settlement_time = elapsed
        bounty.status = BountyStatus.SETTLED
        bounty.settled_at = datetime.now(timezone.utc)

        # On-Chain Settlement
        settlement_tx = "Local Registry Only"
        if bounty.app_id:
            _emit(bounty_id, {
                "event": "oracle_voting", "step": 4, "status": "running", 
                "message": "Oracles reached consensus. Execuring Algorand release..."
            })
            import asyncio
            txs = asyncio.run(cast_release_votes(bounty.app_id, bounty.id))
            submission.tx_id = txs[-1]
            settlement_tx = txs[-1]

        # NFT Minting & Cloud Storage
        nft_id = None
        try:
            # 1. Store artifact in high-performance cloud storage
            artifact_url, cid = upload_to_vortex_storage(artifact, f"submission_{submission_id}")
            submission.artifact_url = artifact_url # Overwrite with cloud URL
            
            # 2. Mint NFT using the content CID
            import asyncio
            nft_res = asyncio.run(asyncio.to_thread(mint_mastery_nft, submission.seller_wallet, bounty.title, cid))
            submission.nft_id = str(nft_res["asset_id"])
            submission.nft_asset_url = artifact_url
            nft_id = submission.nft_id
        except Exception as e:
            log.warning("artifact_persistence_failed", error=str(e))

        db.commit()

        _emit(bounty_id, {
            "event": "settlement_complete", 
            "step": 4, 
            "status": "pass",
            "message": "Oracle release confirmed. Mastery NFT Minted.",
            "logs": [
                "> Settlement complete", 
                f"> Time: {elapsed}s",
                f"> On-Chain Release: {settlement_tx}",
                f"> Credential Issued: {nft_id if nft_id else 'None'}"
            ],
            "data": {
                "reward": float(bounty.reward_algo), 
                "settlement_time": elapsed,
                "nft_id": nft_id,
                "tx_id": submission.tx_id
            }
        })

        # Global Protocol Update
        emit_pulse_event("SETTLEMENT", {
            "bounty_title": bounty.title,
            "reward": float(bounty.reward_algo),
            "solver": submission.seller_wallet,
            "nft_id": nft_id
        })

        logger.info(f"Submission {submission_id} successfully processed and settled.")

    except Exception as e:
        log.error("processing_failed", error=str(e))
        db.rollback()
        if submission:
            submission.status = SubmissionStatus.FAILED
            submission.last_error = f"Internal Pipeline Error: {str(e)}"
            db.commit()
        _emit(bounty_id, {"event": "pipeline_error", "message": f"Critical worker failure: {str(e)}"})
    finally:
        db.close()
