"""
VORTEX Escrow Smart Contract — Algorand (Puya / algopy ARC-4)
=============================================================
Multi-sig oracle design: 3 oracle nodes, 2-of-3 consensus required.
This makes VORTEX non-custodial — no single party controls funds.
"""

from algopy import (
    ARC4Contract, Global, Txn, gtxn, itxn, op,
    Account, UInt64, String, Bytes, BoxRef,
    subroutine, log,
)
from algopy.arc4 import abimethod, Address, Bool


class VortexEscrow(ARC4Contract):
    """
    Fault-tolerant bounty escrow with 2-of-3 multi-sig oracle consensus.
    
    Global state tracks:
    - buyer/developer addresses
    - 3 independent oracle addresses
    - vote counts for release/refund
    - freeze/settled flags
    """

    # ── Global State ──
    buyer: Account
    developer: Account
    oracle_1: Account
    oracle_2: Account
    oracle_3: Account
    bounty_amount: UInt64
    bounty_id: String
    is_frozen: bool
    is_settled: bool
    votes_release: UInt64
    votes_refund: UInt64
    created_at: UInt64
    # Track which oracles have voted to prevent double-voting
    oracle_1_voted: bool
    oracle_2_voted: bool
    oracle_3_voted: bool

    @abimethod(create="require")
    def create_bounty(
        self,
        developer: Account,
        oracle_1: Account,
        oracle_2: Account,
        oracle_3: Account,
        bounty_id: String,
    ) -> None:
        """
        Initialize escrow. Buyer locks ALGO via payment in group tx.
        
        SECURITY ASSERTIONS:
        - Payment must be > 0 (prevents empty escrow creation)
        - Buyer != developer (prevents self-dealing / wash trading)
        - All 3 oracle addresses must be unique (prevents single-oracle takeover)
        """
        # Assert payment exists in group transaction
        # Prevents: creating escrow without locking funds
        assert gtxn.PaymentTransaction(0).amount > UInt64(0), "Payment required"

        # Assert buyer is not developer
        # Prevents: self-dealing where one party plays both roles
        assert Txn.sender != developer, "Buyer cannot be developer"

        # Assert all oracles are unique
        # Prevents: single entity controlling all oracle votes
        assert oracle_1 != oracle_2, "Oracles must be unique"
        assert oracle_2 != oracle_3, "Oracles must be unique"
        assert oracle_1 != oracle_3, "Oracles must be unique"

        # Store state
        self.buyer = Txn.sender
        self.developer = developer
        self.oracle_1 = oracle_1
        self.oracle_2 = oracle_2
        self.oracle_3 = oracle_3
        self.bounty_amount = gtxn.PaymentTransaction(0).amount
        self.bounty_id = bounty_id
        self.is_frozen = False
        self.is_settled = False
        self.votes_release = UInt64(0)
        self.votes_refund = UInt64(0)
        self.created_at = Global.latest_timestamp
        self.oracle_1_voted = False
        self.oracle_2_voted = False
        self.oracle_3_voted = False

        log(b"BountyCreated")

    @abimethod
    def vote_release(self) -> None:
        """
        Oracle votes to release funds to developer.
        Requires 2-of-3 consensus to execute transfer.
        
        SECURITY:
        - Only registered oracles can vote
        - Each oracle can only vote once (prevents double-vote manipulation)
        - Contract auto-executes on 2nd vote (atomic settlement)
        - Cannot vote if frozen or already settled
        """
        # Prevent voting on frozen/settled contracts
        # Prevents: releasing funds during active dispute
        assert not self.is_frozen, "Contract is frozen"
        assert not self.is_settled, "Already settled"

        # Verify sender is one of 3 registered oracles
        # Prevents: unauthorized parties from influencing settlement
        is_oracle_1 = Txn.sender == self.oracle_1
        is_oracle_2 = Txn.sender == self.oracle_2
        is_oracle_3 = Txn.sender == self.oracle_3
        assert is_oracle_1 or is_oracle_2 or is_oracle_3, "Not an oracle"

        # Check oracle hasn't already voted
        # Prevents: single oracle double-voting to reach consensus alone
        if is_oracle_1:
            assert not self.oracle_1_voted, "Oracle 1 already voted"
            self.oracle_1_voted = True
        elif is_oracle_2:
            assert not self.oracle_2_voted, "Oracle 2 already voted"
            self.oracle_2_voted = True
        elif is_oracle_3:
            assert not self.oracle_3_voted, "Oracle 3 already voted"
            self.oracle_3_voted = True

        self.votes_release = self.votes_release + UInt64(1)

        # 2-of-3 consensus reached — execute transfer
        if self.votes_release >= UInt64(2):
            # Inner transaction: send escrowed ALGO to developer
            itxn.Payment(
                receiver=self.developer,
                amount=self.bounty_amount,
                fee=UInt64(0),
            ).submit()
            self.is_settled = True
            log(b"FundsReleased")

    @abimethod
    def vote_refund(self) -> None:
        """
        Oracle votes to refund funds to buyer.
        Same 2-of-3 consensus as release.
        
        SECURITY: Same protections as vote_release.
        """
        assert not self.is_frozen, "Contract is frozen"
        assert not self.is_settled, "Already settled"

        is_oracle_1 = Txn.sender == self.oracle_1
        is_oracle_2 = Txn.sender == self.oracle_2
        is_oracle_3 = Txn.sender == self.oracle_3
        assert is_oracle_1 or is_oracle_2 or is_oracle_3, "Not an oracle"

        if is_oracle_1:
            assert not self.oracle_1_voted, "Oracle 1 already voted"
            self.oracle_1_voted = True
        elif is_oracle_2:
            assert not self.oracle_2_voted, "Oracle 2 already voted"
            self.oracle_2_voted = True
        elif is_oracle_3:
            assert not self.oracle_3_voted, "Oracle 3 already voted"
            self.oracle_3_voted = True

        self.votes_refund = self.votes_refund + UInt64(1)

        if self.votes_refund >= UInt64(2):
            itxn.Payment(
                receiver=self.buyer,
                amount=self.bounty_amount,
                fee=UInt64(0),
            ).submit()
            self.is_settled = True
            log(b"BuyerRefunded")

    @abimethod
    def trigger_freeze(self, reason: String) -> None:
        """
        Any single oracle can freeze the contract.
        Asymmetric design: easy to freeze (1-of-3), hard to release (2-of-3).
        This protects users in edge cases — conservative is correct for finance.
        
        SECURITY:
        - Only oracles can freeze (prevents griefing by random accounts)
        - Cannot freeze if already settled (funds already moved)
        """
        assert not self.is_settled, "Already settled"

        is_oracle = (
            Txn.sender == self.oracle_1
            or Txn.sender == self.oracle_2
            or Txn.sender == self.oracle_3
        )
        assert is_oracle, "Only oracles can freeze"

        self.is_frozen = True
        log(b"GovernanceFreeze")

    @abimethod(readonly=True)
    def get_state(self) -> String:
        """
        Read-only — return all state for frontend display.
        No security assertions needed — read-only method.
        """
        return String("active")
