"""
VORTEX Pydantic Models
======================
Request/Response models expanded for Upwork+ functionality.
"""

from datetime import datetime
from typing import Optional, List, Any, Dict
from enum import Enum

from pydantic import BaseModel, Field, field_validator


# ═══════════════════════════════════════════════
# ENUMS
# ═══════════════════════════════════════════════

class RoleEnum(str, Enum):
    BUYER = "buyer"
    SELLER = "seller"


class BountyStatusEnum(str, Enum):
    ACTIVE = "active"
    PENDING = "pending"
    SETTLED = "settled"
    DISPUTED = "disputed"
    FROZEN = "frozen"
    EXPIRED = "expired"


class DifficultyEnum(str, Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class CategoryEnum(str, Enum):
    PYTHON = "python"
    JAVASCRIPT = "javascript"
    RUST = "rust"
    AI_ML = "ai_ml"
    DESIGN = "design"
    MARKETING = "marketing"
    VIDEO = "video"
    TRANSLATION = "translation"
    DOCUMENT = "document"
    LEGAL = "legal"
    ADMIN = "admin"
    OTHER = "other"


class AssetType(str, Enum):
    CODE = "code"
    MEDIA = "media"
    DOCUMENT = "document"
    CONTRACT = "contract"
    GENERAL = "general"


class VoteEnum(str, Enum):
    RELEASE = "release"
    REFUND = "refund"


class SubmissionStatusEnum(str, Enum):
    PENDING = "pending"
    PASSED = "passed"
    FAILED = "failed"
    FROZEN = "frozen"


# ═══════════════════════════════════════════════
# REQUEST MODELS
# ═══════════════════════════════════════════════

class NonceRequest(BaseModel):
    wallet_address: str = Field(..., description="Algorand wallet address", min_length=58, max_length=58)


class VerifyAuthRequest(BaseModel):
    wallet_address: str = Field(..., description="Algorand wallet address", min_length=58, max_length=58)
    nonce: str = Field(..., description="Nonce from /auth/nonce", min_length=64, max_length=64)
    signature: str = Field(..., description="Base64-encoded signature from Pera Wallet", max_length=4096)
    role: RoleEnum = Field(..., description="User role selection")


class UpdateProfileRequest(BaseModel):
    tagline: Optional[str] = Field(None, max_length=100)
    bio: Optional[str] = Field(None, max_length=1000)
    skills: Optional[List[str]] = Field(None, max_length=30)  # max 30 skills
    github_url: Optional[str] = Field(None, max_length=255)
    portfolio_items: Optional[List[Dict[str, str]]] = Field(None, max_length=20)

    @field_validator("github_url")
    @classmethod
    def validate_github_url(cls, v):
        if v and not (v.startswith("https://github.com/") or v.startswith("https://www.github.com/")):
            raise ValueError("github_url must be a valid GitHub URL")
        return v

    @field_validator("skills")
    @classmethod
    def validate_skills(cls, v):
        if v:
            return [s[:50] for s in v]  # cap each skill at 50 chars
        return v


class CreateBountyRequest(BaseModel):
    title: str = Field(..., description="Bounty title", min_length=5, max_length=255)
    description: str = Field(..., description="Detailed bounty description", max_length=10000)
    requirements: str = Field(..., description="Technical requirements for the solution", max_length=10000)
    verification_criteria: Optional[str] = Field(None, description="Pytest code or subjective acceptance criteria", max_length=20000)
    asset_type: AssetType = Field(AssetType.CODE, description="Expected asset format")
    reward_algo: float = Field(..., description="Reward amount in ALGO", gt=0, le=1_000_000)
    deadline: datetime = Field(..., description="Bounty expiry datetime")
    difficulty: DifficultyEnum = Field(DifficultyEnum.MEDIUM, description="Task difficulty")
    category: CategoryEnum = Field(CategoryEnum.PYTHON, description="Task category")
    app_id: Optional[int] = Field(None, description="Algorand app ID if pre-deployed")


class CreateReviewRequest(BaseModel):
    bounty_id: str
    to_wallet: str
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None

class EvaluateScopeRequest(BaseModel):
    description: str
    verification_criteria: str

class RefineScopeRequest(BaseModel):
    description: str
    requirements: str

class SubmitWorkRequest(BaseModel):
    # 500KB max artifact size — prevents AI pipeline abuse with huge payloads
    artifact: str = Field(..., description="Solution source code or URL to media blob", max_length=512_000)
    developer_address: str = Field(..., description="Developer wallet for payout", min_length=58, max_length=58)
    behavioral_metadata: Optional[Dict[str, Any]] = None


class GenerateTestsRequest(BaseModel):
    prompt: str
    category: Optional[str] = "python"


class ValidateTestsRequest(BaseModel):
    test_code: str
    category: Optional[str] = "python"


class CreateDisputeRequest(BaseModel):
    bounty_id: str = Field(..., description="Bounty to dispute")
    submission_id: str = Field(..., description="Submission to dispute")
    claim: str = Field(..., min_length=10, description="Dispute reason/claim")


class CastVoteRequest(BaseModel):
    vote: VoteEnum = Field(..., description="Vote to release or refund")
    stake_algo: float = Field(..., description="ALGO to stake on this vote", gt=0)


# ═══════════════════════════════════════════════
# RESPONSE MODELS
# ═══════════════════════════════════════════════

class ReviewResponse(BaseModel):
    id: str
    from_wallet: str
    to_wallet: str
    rating: int
    comment: Optional[str] = None
    created_at: str

    class Config:
        from_attributes = True


class UserResponse(BaseModel):
    wallet_address: str
    role: str
    tagline: Optional[str] = None
    bio: Optional[str] = None
    reputation_score: float
    total_earned: float
    total_locked: float
    github_url: Optional[str] = None
    skills: Optional[List[str]] = None
    portfolio_items: Optional[List[Dict[str, str]]] = None
    created_at: str
    
    # Nested reviews
    reviews_received: Optional[List[ReviewResponse]] = None

    class Config:
        from_attributes = True


class BountyResponse(BaseModel):
    id: str
    title: str
    description: str
    requirements: str
    verification_criteria: Optional[str] = None
    asset_type: str
    reward_algo: float
    buyer_wallet: str
    developer_wallet: Optional[str] = None
    status: str
    difficulty: str
    category: str
    deadline: str
    created_at: str
    tx_id: Optional[str] = None
    submission_count: int = 0

    class Config:
        from_attributes = True


class SubmissionResponse(BaseModel):
    id: str
    bounty_id: str
    seller_wallet: str
    artifact: str
    status: str
    static_passed: Optional[bool] = None
    sandbox_passed: Optional[bool] = None
    jury_passed: Optional[bool] = None
    settlement_time: Optional[float] = None
    submitted_at: str

    class Config:
        from_attributes = True


class VerificationEvent(BaseModel):
    type: str  # 'log' | 'status' | 'result'
    message: str
    data: Optional[Dict[str, Any]] = None


class DisputeResponse(BaseModel):
    id: str
    bounty_id: str
    initiator_wallet: str
    reason: str
    status: str
    created_at: str

    class Config:
        from_attributes = True


class TransactionResponse(BaseModel):
    id: str
    wallet_address: str
    type: str
    amount: float
    status: str
    tx_id: Optional[str] = None
    created_at: str

    class Config:
        from_attributes = True


class HealthResponse(BaseModel):
    status: str
    algorand: str
    docker: str
    oracle_nodes: List[str]
    uptime: float


class TestGenerationResponse(BaseModel):
    tests: str
    explanation: Optional[str] = None


class StandardResponse(BaseModel):
    success: bool
    data: Any = None
    error: Optional[str] = None
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
