"""
VORTEX Database Layer
=====================
SQLAlchemy ORM with SQLite. Expanded for Upwork+ functionality.
"""

import uuid
import json
import os
from datetime import datetime, timezone
from enum import Enum as PyEnum
from dotenv import load_dotenv

from sqlalchemy import (
    create_engine, Column, String, Text, Float, Integer, Boolean,
    DateTime, JSON, ForeignKey, Index, Enum, event
)
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from sqlalchemy.pool import StaticPool

Base = declarative_base()


# ═══════════════════════════════════════════════
# ENUMS
# ═══════════════════════════════════════════════

class CaseInsensitiveEnum(str, PyEnum):
    @classmethod
    def _missing_(cls, value):
        if isinstance(value, str):
            for member in cls:
                if member.value.upper() == value.upper():
                    return member
        return None

class UserRole(CaseInsensitiveEnum):
    BUYER = "BUYER"
    SELLER = "SELLER"

class BountyStatus(CaseInsensitiveEnum):
    ACTIVE = "ACTIVE"
    PENDING = "PENDING"
    SETTLED = "SETTLED"
    DISPUTED = "DISPUTED"
    FROZEN = "FROZEN"
    EXPIRED = "EXPIRED"

class Difficulty(CaseInsensitiveEnum):
    EASY = "EASY"
    MEDIUM = "MEDIUM"
    HARD = "HARD"

class Category(CaseInsensitiveEnum):
    PYTHON = "PYTHON"
    JAVASCRIPT = "JAVASCRIPT"
    RUST = "RUST"
    AI_ML = "AI_ML"
    DESIGN = "DESIGN"
    MARKETING = "MARKETING"
    VIDEO = "VIDEO"
    TRANSLATION = "TRANSLATION"
    DOCUMENT = "DOCUMENT"
    LEGAL = "LEGAL"
    ADMIN = "ADMIN"
    OTHER = "OTHER"

class AssetType(CaseInsensitiveEnum):
    CODE = "CODE"
    MEDIA = "MEDIA"
    DOCUMENT = "DOCUMENT"
    CONTRACT = "CONTRACT"
    GENERAL = "GENERAL"

class SubmissionStatus(CaseInsensitiveEnum):
    PENDING = "PENDING"
    PASSED = "PASSED"
    FAILED = "FAILED"
    FROZEN = "FROZEN"

class VoteType(CaseInsensitiveEnum):
    RELEASE = "RELEASE"
    REFUND = "REFUND"

class DisputeStatus(CaseInsensitiveEnum):
    ACTIVE = "ACTIVE"
    RESOLVED = "RESOLVED"

class TransactionType(CaseInsensitiveEnum):
    LOCK = "LOCK"
    PAYOUT = "PAYOUT"
    REFUND = "REFUND"
    STAKE = "STAKE"
    FREEZE = "FREEZE"
    REWARD = "REWARD"

class TransactionStatus(CaseInsensitiveEnum):
    CONFIRMED = "CONFIRMED"
    PENDING = "PENDING"
    FAILED = "FAILED"


# ═══════════════════════════════════════════════
# HELPER
# ═══════════════════════════════════════════════

def generate_uuid():
    return str(uuid.uuid4())


def utcnow():
    return datetime.now(timezone.utc)


# ═══════════════════════════════════════════════
# MODELS
# ═══════════════════════════════════════════════

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    wallet_address = Column(String(58), unique=True, nullable=False, index=True)
    role = Column(String(50), nullable=False)
    
    # Profile Data
    tagline = Column(String(255), nullable=True)
    bio = Column(Text, nullable=True)
    portfolio_items = Column(JSON, nullable=True)  # List of {title, url, type}
    github_url = Column(String(255), nullable=True)
    skills = Column(JSON, nullable=True)
    
    # Stats
    reputation_score = Column(Float, default=0.0)
    total_earned = Column(Float, default=0.0)
    total_locked = Column(Float, default=0.0)
    
    created_at = Column(DateTime, default=utcnow)
    last_active = Column(DateTime, default=utcnow, onupdate=utcnow)

    # Relationships
    bounties_posted = relationship("Bounty", back_populates="buyer", foreign_keys="Bounty.buyer_wallet")
    reviews_received = relationship("Review", back_populates="to_user", foreign_keys="Review.to_wallet")
    reviews_given = relationship("Review", back_populates="from_user", foreign_keys="Review.from_wallet")


class Bounty(Base):
    __tablename__ = "bounties"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    requirements = Column(Text, nullable=False)
    verification_criteria = Column(Text, nullable=True)
    asset_type = Column(String(50), default=AssetType.CODE)
    generated_tests = Column(Boolean, default=False)
    reward_algo = Column(Float, nullable=False)
    buyer_wallet = Column(String(58), ForeignKey("users.wallet_address"), nullable=False, index=True)
    developer_wallet = Column(String(58), ForeignKey("users.wallet_address"), nullable=True, index=True)
    app_id = Column(Integer, nullable=True)
    status = Column(String(50), default=BountyStatus.ACTIVE, index=True)
    difficulty = Column(String(50), default=Difficulty.MEDIUM)
    category = Column(String(50), default=Category.PYTHON)
    deadline = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=utcnow)
    settled_at = Column(DateTime, nullable=True)
    settlement_time_seconds = Column(Float, nullable=True)
    tx_id = Column(String(64), nullable=True, index=True)

    # Relationships
    buyer = relationship("User", back_populates="bounties_posted", foreign_keys=[buyer_wallet])
    submissions = relationship("Submission", back_populates="bounty")
    disputes = relationship("Dispute", back_populates="bounty")
    comments = relationship("Comment", back_populates="bounty")


class Submission(Base):
    __tablename__ = "submissions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    bounty_id = Column(String(36), ForeignKey("bounties.id"), nullable=False, index=True)
    seller_wallet = Column(String(58), ForeignKey("users.wallet_address"), nullable=False, index=True)
    artifact_url = Column(Text, nullable=False)
    submitted_at = Column(DateTime, default=utcnow)
    static_passed = Column(Boolean, nullable=True)
    sandbox_passed = Column(Boolean, nullable=True)
    jury_passed = Column(Boolean, nullable=True)
    static_logs = Column(JSON, nullable=True)
    sandbox_logs = Column(JSON, nullable=True)
    jury_logs = Column(JSON, nullable=True)
    settlement_time = Column(Float, nullable=True)
    status = Column(String(50), default=SubmissionStatus.PENDING, index=True)
    tx_id = Column(String(64), nullable=True)
    
    # Forensic Behavioral Metadata (Typed completion signals)
    behavioral_metadata = Column(JSON, nullable=True) 
    forensic_report = Column(JSON, nullable=True) 

    # Professional Mastery NFT markers
    nft_id = Column(String(36), nullable=True)
    nft_asset_url = Column(Text, nullable=True)

    # Relationships
    bounty = relationship("Bounty", back_populates="submissions")


class Review(Base):
    __tablename__ = "reviews"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    bounty_id = Column(String(36), ForeignKey("bounties.id"), nullable=False)
    from_wallet = Column(String(58), ForeignKey("users.wallet_address"), nullable=False)
    to_wallet = Column(String(58), ForeignKey("users.wallet_address"), nullable=False)
    
    rating = Column(Integer, nullable=False)  # 1-5
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utcnow)

    # Relationships
    from_user = relationship("User", back_populates="reviews_given", foreign_keys=[from_wallet])
    to_user = relationship("User", back_populates="reviews_received", foreign_keys=[to_wallet])


class Comment(Base):
    __tablename__ = "comments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    bounty_id = Column(String(36), ForeignKey("bounties.id"), nullable=False, index=True)
    wallet_address = Column(String(58), nullable=False)
    text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=utcnow)

    # Relationships
    bounty = relationship("Bounty", back_populates="comments")


class OracleVote(Base):
    __tablename__ = "oracle_votes"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    bounty_id = Column(String(36), ForeignKey("bounties.id"), nullable=False, index=True)
    oracle_node = Column(Integer, nullable=False)  # 1, 2, or 3
    vote = Column(String(50), nullable=False)
    tx_id = Column(String(64), nullable=True)
    voted_at = Column(DateTime, default=utcnow)


class Dispute(Base):
    __tablename__ = "disputes"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    bounty_id = Column(String(36), ForeignKey("bounties.id"), nullable=False, index=True)
    submission_id = Column(String(36), ForeignKey("submissions.id"), nullable=False)
    initiator_wallet = Column(String(58), nullable=False)
    buyer_claim = Column(Text, nullable=True)
    seller_claim = Column(Text, nullable=True)
    status = Column(String(50), default=DisputeStatus.ACTIVE, index=True)
    created_at = Column(DateTime, default=utcnow)
    resolved_at = Column(DateTime, nullable=True)
    resolution = Column(String(50), nullable=True)
    arbiter_count = Column(Integer, default=0)
    case_file_cid = Column(String(64), nullable=True)

    # Relationships
    bounty = relationship("Bounty", back_populates="disputes")
    votes = relationship("ArbiterVote", back_populates="dispute")


class ArbiterVote(Base):
    __tablename__ = "arbiter_votes"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    dispute_id = Column(String(36), ForeignKey("disputes.id"), nullable=False, index=True)
    voter_wallet = Column(String(58), nullable=False)
    vote = Column(String(50), nullable=False)
    stake_algo = Column(Float, nullable=False)
    voted_at = Column(DateTime, default=utcnow)
    rewarded = Column(Boolean, default=False)

    # Relationships
    dispute = relationship("Dispute", back_populates="votes")


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    wallet_address = Column(String(58), nullable=False, index=True)
    type = Column(String(50), nullable=False)
    amount_algo = Column(Float, nullable=False)
    tx_hash = Column(String(64), unique=True, nullable=False)
    status = Column(String(50), default="PENDING")
    created_at = Column(DateTime, default=utcnow)
    bounty_id = Column(String(36), nullable=True)


# ═══════════════════════════════════════════════
# DATABASE ENGINE
# ═══════════════════════════════════════════════
load_dotenv()

# Absolute path resolution for SQLite to prevent shadowing
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_DB_PATH = os.path.join(BASE_DIR, "vortex.db")

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    DATABASE_URL = f"sqlite:///{DEFAULT_DB_PATH}"

# For SQLite, ensure thread safety for FastAPI
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

# Industrial Connection Pooling for Enterprise Scalability
if DATABASE_URL.startswith("postgresql"):
    engine = create_engine(
        DATABASE_URL,
        pool_size=20,
        max_overflow=10,
        pool_timeout=30,
        pool_recycle=1800,
    )
else:
    # Use StaticPool for SQLite memory compatibility or single-threaded disk WAL
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {},
        poolclass=StaticPool if "sqlite" in DATABASE_URL else None,
        echo=False,
    )

# Enable WAL mode for concurrent reads
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db():
    """Create all tables if they don't exist."""
    Base.metadata.create_all(bind=engine)


def check_db_health():
    """Proactive diagnostic check for database connectivity."""
    try:
        db = SessionLocal()
        from sqlalchemy import text
        db.execute(text("SELECT 1"))
        db.close()
        return True
    except Exception:
        return False


def get_db():
    """FastAPI dependency — yields a DB session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
