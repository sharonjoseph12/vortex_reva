from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timezone
import logging
import json
import ipfs

from database import (
    get_db, Dispute, ArbiterVote, Bounty, User, Submission, Comment,
    DisputeStatus, BountyStatus, VoteType, UserRole, Transaction, TransactionType, TransactionStatus
)
from auth import require_auth
from models import CreateDisputeRequest, CastVoteRequest
from oracle import cast_freeze_vote, cast_release_votes, cast_refund_votes
from api.pulse import emit_pulse_event

router = APIRouter(prefix="/governance", tags=["Governance"])
logger = logging.getLogger("vortex.governance")

def _resp(data=None, error=None) -> dict:
    return {
        "success": error is None,
        "data": data,
        "error": error,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

@router.get("/disputes")
async def list_disputes(db: Session = Depends(get_db)):
    disputes = db.query(Dispute).filter(Dispute.status == DisputeStatus.ACTIVE).all()
    items = []
    for d in disputes:
        votes = db.query(ArbiterVote).filter(ArbiterVote.dispute_id == d.id).all()
        items.append({
            "id": d.id, "bounty_id": d.bounty_id, "status": d.status.value,
            "release_votes": sum(1 for v in votes if v.vote == VoteType.RELEASE),
            "refund_votes": sum(1 for v in votes if v.vote == VoteType.REFUND),
            "arbiter_count": len(votes),
        })
    return _resp({"disputes": items})

@router.post("/disputes")
async def create_dispute(req: CreateDisputeRequest, user: dict = Depends(require_auth), db: Session = Depends(get_db)):
    u = db.query(User).filter(User.wallet_address == user["wallet"]).first()
    if not u or u.reputation_score < 3.0:
        raise HTTPException(400, "Insufficient Reputation to initiate dispute (Min 3.0)")

    bounty = db.query(Bounty).filter(Bounty.id == req.bounty_id).first()
    if not bounty:
        raise HTTPException(404, "Bounty not found")

    # MANDATORY DISPUTE STAKE: 5 ALGO
    # In a real wallet, we would check the on-chain balance. Here we check the total_earned (liquid).
    if u.total_earned < 5.0:
         raise HTTPException(400, "Insufficient liquid ALGO for dispute stake (Req: 5.0 ALGO)")

    dispute = Dispute(
        bounty_id=req.bounty_id, submission_id=req.submission_id,
        initiator_wallet=user["wallet"],
    )
    if user["role"] == "buyer":
        dispute.buyer_claim = req.claim
    else:
        dispute.seller_claim = req.claim

    db.add(dispute)
    bounty.status = BountyStatus.DISPUTED
    
    # Lock the stake
    u.total_earned -= 5.0
    u.total_locked += 5.0
    
    freeze_tx = Transaction(
        wallet_address=user["wallet"],
        type=TransactionType.FREEZE,
        amount_algo=-5.0,
        tx_hash=f"vortex_freeze_{dispute.id[:8]}",
        status=TransactionStatus.CONFIRMED,
        bounty_id=bounty.id
    )
    db.add(freeze_tx)
    
    db.commit()
    db.refresh(dispute)

    return _resp({"dispute_id": dispute.id, "stake_locked": 5.0})

@router.get("/arbiters")
async def get_arbiter_pulse(db: Session = Depends(get_db)):
    arbiters = db.query(User).filter(User.role == UserRole.BUYER).all()
    pulse = []
    total_disputes = db.query(Dispute).count()
    
    for arb in arbiters:
        votes = db.query(ArbiterVote).filter(ArbiterVote.voter_wallet == arb.wallet_address).all()
        if not votes: continue
        
        alignment = sum(1 for v in votes if v.rewarded) / len(votes) * 100 if votes else 0
        pulse.append({
            "wallet": arb.wallet_address,
            "participation": (len(votes) / total_disputes * 100) if total_disputes > 0 else 0,
            "alignment": round(alignment, 1),
            "total_votes": len(votes),
            "status": "Elite" if alignment > 90 else "Active"
        })
        
    return _resp({
        "total_arbiters": len(pulse),
        "arbiter_pulse": sorted(pulse, key=lambda x: x["alignment"], reverse=True)
    })

@router.get("/my-earnings")
async def get_governance_earnings(user: dict = Depends(require_auth), db: Session = Depends(get_db)):
    txns = db.query(Transaction).filter(
        Transaction.wallet_address == user["wallet"],
        Transaction.status == TransactionStatus.CONFIRMED,
        Transaction.type.in_([TransactionType.REWARD, TransactionType.FREEZE])
    ).all()
    
    total_rewarded = sum(t.amount_algo for t in txns if t.type == TransactionType.REWARD)
    total_slashed = sum(abs(t.amount_algo) for t in txns if t.type == TransactionType.FREEZE)
    
    return _resp({
        "total_rewarded": total_rewarded,
        "total_slashed": total_slashed,
        "net_delta": total_rewarded - total_slashed,
        "history": [{"bounty_id": t.bounty_id, "amount": t.amount_algo, "date": t.created_at.isoformat()} for t in txns]
    })
@router.get("/disputes/{dispute_id}")
async def get_dispute(dispute_id: str, db: Session = Depends(get_db)):
    d = db.query(Dispute).filter(Dispute.id == dispute_id).first()
    if not d:
        raise HTTPException(404, "Dispute not found")
        
    votes = db.query(ArbiterVote).filter(ArbiterVote.dispute_id == dispute_id).all()
    
    submission = db.query(Submission).filter(Submission.id == d.submission_id).first()
    
    return _resp({
        "id": d.id, "bounty_id": d.bounty_id, "submission_id": d.submission_id,
        "initiator_wallet": d.initiator_wallet, "buyer_claim": d.buyer_claim,
        "seller_claim": d.seller_claim, "status": d.status.value,
        "created_at": d.created_at.isoformat() if d.created_at else None,
        "submission_artifact": submission.artifact_url if submission else None,
        "forensic_report": submission.forensic_report if submission else None,
        "case_file_cid": d.case_file_cid,
        "votes": [{
            "voter": v.voter_wallet, "vote": v.vote.value, "stake": v.stake_algo
        } for v in votes]
    })

@router.get("/profiles/{wallet}/audit")
async def get_profile_audit(wallet: str, db: Session = Depends(get_db)):
    """Generates a Sovereign Proof of Mastery manifest for a partner."""
    # Bounties solved by this user
    solved = db.query(Bounty).filter(Bounty.developer_wallet == wallet, Bounty.status == BountyStatus.SETTLED).all()
    # Bounties posted by this user
    posted = db.query(Bounty).filter(Bounty.buyer_wallet == wallet, Bounty.status == BountyStatus.SETTLED).all()
    
    manifest = {
        "wallet": wallet,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "total_finalized": len(solved) + len(posted),
        "solved_missions": [{
            "id": b.id, "title": b.title, "reward": float(b.reward_algo), "date": b.settled_at.isoformat()
        } for b in solved],
        "directed_missions": [{
            "id": b.id, "title": b.title, "volume": float(b.reward_algo), "date": b.settled_at.isoformat()
        } for b in posted]
    }
    return _resp(manifest)


async def bundle_dispute_evidence(dispute_id: str, db: Session):
    """Aggregates all forensic evidence for immutable IPFS pinning."""
    d = db.query(Dispute).filter(Dispute.id == dispute_id).first()
    if not d: return None
    
    bounty = db.query(Bounty).filter(Bounty.id == d.bounty_id).first()
    submission = db.query(Submission).filter(Submission.id == d.submission_id).first()
    comments = db.query(Comment).filter(Comment.bounty_id == d.bounty_id).all()
    
    bundle = {
        "vortex_audit_v1": {
            "dispute_id": d.id,
            "resolved_at": d.resolved_at.isoformat() if d.resolved_at else None,
            "resolution": d.resolution.value if d.resolution else None,
            "claims": {
                "buyer": d.buyer_claim,
                "seller": d.seller_claim
            },
            "forensic_intel": submission.forensic_report if submission else None,
            "mission_chat": [{
                "wallet": c.wallet_address,
                "text": c.text,
                "at": c.created_at.isoformat()
            } for c in comments],
            "submission_fingerprint": {
                "artifact_url": submission.artifact_url if submission else None,
                "static_passed": submission.static_passed,
                "sandbox_passed": submission.sandbox_passed
            }
        }
    }
    return bundle

@router.post("/disputes/{dispute_id}/vote")
async def vote_dispute(
    dispute_id: str, req: CastVoteRequest, 
    user: dict = Depends(require_auth), db: Session = Depends(get_db)
):
    # ELITE ADJUDICATOR GATE: Rep > 4.5
    u = db.query(User).filter(User.wallet_address == user["wallet"]).first()
    if not u or u.reputation_score < 4.5:
        raise HTTPException(403, "Elite status required to adjudicate disputes (Min 4.5 Rep)")

    d = db.query(Dispute).filter(Dispute.id == dispute_id).first()
    if not d or d.status != DisputeStatus.ACTIVE:
        raise HTTPException(400, "Dispute is not active")

    # Check if already voted
    existing = db.query(ArbiterVote).filter(
        ArbiterVote.dispute_id == dispute_id,
        ArbiterVote.voter_wallet == user["wallet"]
    ).first()
    if existing:
        raise HTTPException(400, "Already voted on this case")

    # Arbiters must stake 2 ALGO to vote (Skin in the Game)
    if u.total_earned < 2.0:
        raise HTTPException(400, "Insufficient ALGO to stake for vote (Req: 2.0)")
    
    u.total_earned -= 2.0
    u.total_locked += 2.0

    vote = ArbiterVote(
        dispute_id=dispute_id, voter_wallet=user["wallet"],
        vote=req.vote, stake_algo=2.0
    )
    db.add(vote)
    
    # Simple consensus logic (at 3 votes for demo)
    all_votes = db.query(ArbiterVote).filter(ArbiterVote.dispute_id == dispute_id).all()
    if len(all_votes) >= 3:
        bounty = db.query(Bounty).filter(Bounty.id == d.bounty_id).first()
        release_c = sum(1 for v in all_votes if v.vote == VoteType.RELEASE)
        refund_c = len(all_votes) - release_c
        
        majority = VoteType.RELEASE if release_c > refund_c else VoteType.REFUND
        d.status = DisputeStatus.RESOLVED
        d.resolution = majority
        d.resolved_at = datetime.now(timezone.utc)
        
        # --- SOVEREIGN EVIDENCE VAULT ---
        try:
            bundle = await bundle_dispute_evidence(dispute_id, db)
            if bundle:
                bundle_json = json.dumps(bundle)
                d.case_file_cid = ipfs.generate_ipfs_cid(bundle_json)
        except Exception as e:
            print(f"[AUDIT-VAULT-ERROR] Failed to pin evidence: {e}")
        # --------------------------------
        
        # Economic Slashing & Reward Distribution
        initiator = db.query(User).filter(User.wallet_address == d.initiator_wallet).first()
        winners = [v for v in all_votes if v.vote == majority]
        losers = [v for v in all_votes if v.vote != majority]
        
        # Scenario: Initiator Loses (Slashed)
        # Initiator is 'buyer' but majority is 'release' (for seller) -> Initiator lost
        initiator_lost = (d.buyer_claim and majority == VoteType.RELEASE) or (d.seller_claim and majority == VoteType.REFUND)
        
        stake_to_distribute = 0.0
        if initiator_lost:
             stake_to_distribute = 5.0 # The dispute initiation fee
             if initiator:
                 initiator.total_locked -= 5.0 # Slashed.
        else:
             # Initiator wins, return their 5 ALGO
             if initiator:
                 initiator.total_locked -= 5.0
                 initiator.total_earned += 5.0

        # Reward Arbiters who voted with majority
        if winners:
            reward_bonus = stake_to_distribute / len(winners)
            for v in winners:
                v.rewarded = True 
                v_user = db.query(User).filter(User.wallet_address == v.voter_wallet).first()
                if v_user:
                    v_user.total_locked -= 2.0 # Unlock stake
                    v_user.total_earned += (2.0 + reward_bonus) # Return stake + share of slash
                    
        # Slash Arbiters who voted against majority
        for v in losers:
             v_user = db.query(User).filter(User.wallet_address == v.voter_wallet).first()
             if v_user:
                 v_user.total_locked -= 2.0 # Lost their 2 ALGO stake.

        # Layer 4: On-Chain Settlement Bridge
        if bounty and bounty.app_id:
            try:
                if majority == VoteType.RELEASE:
                    await cast_release_votes(bounty.app_id, bounty.id)
                    bounty.status = BountyStatus.SETTLED
                else:
                    await cast_refund_votes(bounty.app_id, bounty.id)
                    bounty.status = BountyStatus.SETTLED
            except Exception as e:
                logger.error(f"On-chain governance settlement failed: {e}")

        await emit_pulse_event("GOVERNANCE_RESOLVED", {
            "dispute_id": dispute_id, 
            "resolution": majority.value,
            "bounty_id": bounty.id if bounty else None
        })

    db.commit()
    return _resp({"recorded": True, "total_votes": len(all_votes)})
