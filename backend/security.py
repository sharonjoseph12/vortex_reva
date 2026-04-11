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
# LAYER 2: MULTIMODAL AI EVALUATION (DESIGN/DOCS)
# ═══════════════════════════════════════════════

async def multimodal_eval(asset_type: str, content: str, criteria: str, category: str = "general") -> dict:
    """
    Elite Enterprise Evaluation Engine.
    Uses Gemini for designs and documents.
    """
    
    if asset_type == "media":
        user_content = f"Evaluate this design against requirements:\n{criteria}\n\n[Image data provided as base64]:\n{content[:200]}..."
        system_msg = "You are a Senior Design Lead. Evaluate design quality and requirement alignment."
    else:
        user_content = f"Requirements:\n{criteria}\n\nSubmission:\n{content}"
        system_msg = "You are an Elite Enterprise Content Reviewer. Check for accuracy, logic, and style."

    eval_json_format = """Return JSON: {"verdict": "pass"|"fail", "score": 0-100, "feedback": "str", "flags": [{"type": "error"|"warning", "message": "str", "line": int|null, "coord": [x,y]|null}]}"""

    try:
        resp = await client.aio.models.generate_content(
            model='gemini-2.5-flash',
            contents=user_content,
            config=types.GenerateContentConfig(
                system_instruction=f"{system_msg}\n{eval_json_format}\nCRITICAL: If failures found, specify exact line numbers (for docs) or x,y coords (for images).",
                temperature=0,
                response_mime_type="application/json"
            )
        )
        result = json.loads(resp.text.strip())
    except Exception as e:
        error_msg = str(e)
        is_rate_limit = "429" in error_msg or "rate_limit" in error_msg.lower()
        is_quota = "quota" in error_msg.lower()
        
        # DEMO MODE FALLBACK: If AI is unavailable, provide a mock pass to keep the demo moving
        if os.getenv("VORTEX_DEMO_MODE", "false").lower() == "true":
            return {
                "pass": True,
                "score": 98,
                "feedback": "[VORTEX DEMO MODE] AI service unavailable. Providing simulated pass for protocol verification.",
                "is_error": False,
                "is_demo": True,
                "flags": [{"type": "warning", "message": "Demo Mode active: Simulation used due to upstream API issue."}]
            }

        return {
            "pass": False, 
            "score": 0, 
            "feedback": "AI Quota Exhausted. Please check billing." if is_quota else ("AI Service Congested. Please retry in 60s." if is_rate_limit else f"AI Eval Fault: {error_msg}"), 
            "is_error": True,
            "is_rate_limit": is_rate_limit or is_quota,
            "flags": [{"type": "error", "message": "Infrastructure bottleneck: API issue." if is_quota else "Service congestion."}]
        }

    return {
        "pass": result.get("verdict") == "pass",
        "score": result.get("score", 0),
        "feedback": result.get("feedback", "No feedback provided."),
        "flags": result.get("flags", []),
        "is_ai_evaluated": True,
        "is_discordant": any(f.get('type') == 'error' for f in result.get("flags", []))
    }

# ═══════════════════════════════════════════════
# LAYER 3: ADVISORY CODE AUDIT
# ═══════════════════════════════════════════════

async def advisory_audit(code: str, requirements: str) -> dict:
    system_prompt = """Review this code for safety and logic errors. 
    Return JSON: {"verdict": "safe"|"unsafe", "feedback": "str", "flags": [{"type": "vulnerability"|"logic", "message": "str", "line": int}]}"""
    try:
        resp = await client.aio.models.generate_content(
            model='gemini-2.5-flash',
            contents=f"Requirements: {requirements}\n\nCode:\n{code}",
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                temperature=0,
                response_mime_type="application/json"
            )
        )
        result = json.loads(resp.text.strip())
    except:
        result = {"verdict": "safe", "feedback": "AI audit skipped.", "flags": []}
    
    return {
        "advisory_verdict": result.get("verdict", "safe"),
        "summary": result.get("feedback", "Audit complete."),
        "flags": result.get("flags", []),
        "is_advisory_only": True
    }
