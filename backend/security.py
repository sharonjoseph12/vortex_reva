"""
VORTEX Security Layer
=====================
Multi-modal verification engine for code, design, and documents.
"""

import ast
import asyncio
import json
import os
from typing import Optional

from google import genai
from google.genai import types
from dotenv import load_dotenv
from tenacity import retry, wait_exponential, stop_after_attempt, retry_if_exception_type

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# ═══════════════════════════════════════════════
# LAYER 1: STATIC AST ANALYSIS (CODE ONLY)
# ═══════════════════════════════════════════════

DANGEROUS_PATTERNS = {
    "eval": "Dynamic code execution", "exec": "Dynamic code execution",
    "compile": "Code compilation", "__import__": "Dynamic import",
    "subprocess": "Shell command", "os.system": "Shell command",
    "socket": "Network access", "pickle": "Deserialization",
}

DANGEROUS_MODULES = {"subprocess", "os", "sys", "socket", "urllib", "requests"}

def static_analysis(code: str) -> dict:
    flagged = []
    try:
        tree = ast.parse(code)
        for node in ast.walk(tree):
            if isinstance(node, ast.Call):
                name = _get_call_name(node)
                if name in DANGEROUS_PATTERNS: flagged.append(name)
    except Exception as e:
        return {"pass": False, "reason": f"Syntax Error: {str(e)}"}
    
    return {
        "pass": len(flagged) == 0,
        "flagged_patterns": flagged,
        "risk_level": "low" if not flagged else "high",
        "reason": "Safe" if not flagged else f"Detected: {', '.join(flagged)}"
    }

def _get_call_name(node: ast.Call) -> str:
    if isinstance(node.func, ast.Name): return node.func.id
    return ""

# ═══════════════════════════════════════════════
# LAYER 2: MULTI-AGENT AI CONSENSUS (THE "JUDGE" MODEL)
# ═══════════════════════════════════════════════

@retry(
    wait=wait_exponential(multiplier=1, min=2, max=10),
    stop=stop_after_attempt(3),
    retry=retry_if_exception_type(Exception),
    reraise=True
)
async def _ask_agent(system_msg: str, user_msg: str) -> dict:
    """Helper to call Gemini with retries and JSON consistency."""
    try:
        resp = await client.aio.models.generate_content(
            model='gemini-2.5-flash', # Using stable high-perf model
            contents=user_msg,
            config=types.GenerateContentConfig(
                system_instruction=system_msg,
                temperature=0.1, # Slight temperature for creative debugging
                response_mime_type="application/json"
            )
        )
        return json.loads(resp.text.strip())
    except Exception as e:
        if "429" in str(e) or "503" in str(e): raise e # Trigger retry
        return {"error": str(e), "verdict": "fail", "feedback": f"API Error: {str(e)}"}

async def multi_agent_consensus(asset_type: str, content: str, criteria: str) -> dict:
    """
    Advanced Startup Consensus Engine.
    1. Prosecutor: Finds every reason to FAIL.
    2. Defender: Finds every reason to PASS.
    3. Judge: Analyzes both and makes final decision.
    """
    
    # ── AGENT 1: PROSECUTOR (CRITICAL AUDITOR) ──
    p_system = "You are a Ruthless Prosecutor. Your goal is to find bugs, requirement violations, and quality flaws. DO NOT mention positives."
    p_user = f"Bounty Criteria:\n{criteria}\n\nSubmission Content:\n{content[:5000]}" # Limit context
    
    p_task = _ask_agent(p_system, f"{p_user}\n\nReturn JSON: " + '{"indictment": "str", "violations": [{"type": "str", "message": "str"}]}')

    # ── AGENT 2: DEFENDER (ADVOCATE) ──
    d_system = "You are a Sophisticated Defender. Your goal is to prove the submission meets all criteria and highlight its strengths."
    d_user = p_user
    d_task = _ask_agent(d_system, f"{d_user}\n\nReturn JSON: " + '{"brief": "str", "strengths": [{"type": "str", "message": "str"}]}')

    # Run in parallel
    p_res, d_res = await asyncio.gather(p_task, d_task)

    # ── AGENT 3: THE JUDGE (FINAL ARBITER) ──
    j_system = "You are the Supreme Judge of the VORTEX Protocol. You must weigh the Prosecutor's indictment and the Defender's brief to reach a final verdict."
    j_user = f"""
    CRITERIA: {criteria}
    
    PROSECUTOR'S INDICTMENT:
    {json.dumps(p_res)}
    
    DEFENDER'S BRIEF:
    {json.dumps(d_res)}
    
    VERDICT GUIDELINES:
    - Pass if all core requirements met.
    - Fail if security risk or missing functional criteria.
    """
    
    j_msg = j_user + "\n\nReturn JSON: " + '{"verdict": "pass"|"fail", "score": 0-100, "feedback": "str"}'
    
    final_res = await _ask_agent(j_system, j_msg)
    
    return {
        "pass": final_res.get("verdict") == "pass",
        "score": final_res.get("score", 0),
        "feedback": final_res.get("feedback", "No consensus reached"),
        "agents": {
            "prosecutor": p_res,
            "defender": d_res
        }
    }

async def multimodal_eval(asset_type: str, content: str, criteria: str, category: str = "general") -> dict:
    """Enhanced Multimodal eval using consensus."""
    # Logic for image handling could be added here, but for now we follow the general consensus pattern
    res = await multi_agent_consensus(asset_type, content, criteria)
    return {
        "pass": res["pass"],
        "score": res["score"],
        "feedback": res["feedback"],
        "is_ai_evaluated": True,
        "agent_logs": res["agents"]
    }

# ═══════════════════════════════════════════════
# LAYER 3: ADVISORY CODE AUDIT
# ═══════════════════════════════════════════════

async def advisory_audit(code: str, requirements: str) -> dict:
    """Consensus-based audit for technical requirements."""
    res = await multi_agent_consensus("code", code, requirements)
    return {
        "advisory_verdict": "safe" if res["pass"] else "unsafe",
        "summary": res["feedback"],
        "is_advisory_only": True,
        "agent_logs": res["agents"]
    }
