from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db, Comment, Bounty, User
from auth import require_auth
from typing import List
from pydantic import BaseModel
from datetime import datetime

router = APIRouter(prefix="/bounties", tags=["Comments"])

class CommentCreate(BaseModel):
    text: str

class CommentResponse(BaseModel):
    id: str
    wallet_address: str
    text: str
    created_at: datetime

    class Config:
        from_attributes = True

def _resp(data=None, error=None) -> dict:
    return {
        "success": error is None,
        "data": data,
        "error": error
    }

@router.get("/{bounty_id}/comments")
async def get_comments(bounty_id: str, db: Session = Depends(get_db)):
    comments = db.query(Comment).filter(Comment.bounty_id == bounty_id).order_by(Comment.created_at.asc()).all()
    return _resp([
        {
            "id": c.id,
            "wallet_address": c.wallet_address,
            "text": c.text,
            "created_at": c.created_at.isoformat()
        } for c in comments
    ])

@router.post("/{bounty_id}/comments")
async def post_comment(bounty_id: str, req: CommentCreate, user: dict = Depends(require_auth), db: Session = Depends(get_db)):
    bounty = db.query(Bounty).filter(Bounty.id == bounty_id).first()
    if not bounty:
        raise HTTPException(status_code=404, detail="Bounty not found")
    
    new_comment = Comment(
        bounty_id=bounty_id,
        wallet_address=user["wallet"],
        text=req.text
    )
    db.add(new_comment)
    db.commit()
    db.refresh(new_comment)
    
    return _resp({
        "id": new_comment.id,
        "wallet_address": new_comment.wallet_address,
        "text": new_comment.text,
        "created_at": new_comment.created_at.isoformat()
    })
