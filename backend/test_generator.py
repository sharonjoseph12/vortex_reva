"""
VORTEX AI Test Generator
========================
Generates pytest unit tests from plain English descriptions.
Makes VORTEX usable by non-technical buyers.
"""

import ast
import os
import tempfile
import subprocess
import shutil
import json

from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

CODE_CATEGORIES = {"python", "javascript", "rust", "ai_ml", "code"}

NON_CODE_SYSTEM_PROMPT = """You are an expert creative and professional evaluator. Generate clear, objective, measurable evaluation criteria for the task described.
RULES:
1. Generate 5-8 specific criteria covering quality, completeness, and deliverable requirements
2. Each criterion must be binary and objectively verifiable (pass/fail)
3. Do NOT generate code or pytest tests
4. No vague terms like "looks good", "high quality", "clean" — be specific and measurable
5. Return ONLY a numbered plain-text list, no markdown headers, no backticks
6. Tailor criteria to the category: design=visual specs, document=content/format, legal=clauses/compliance"""

async def generate_unit_tests(task_description: str, category: str = "python") -> dict:
    """Generate tests (code) or evaluation criteria (non-code) from plain English."""
    warnings = []
    is_code = category.lower() in CODE_CATEGORIES

    if not is_code:
        # Non-code bounty: generate natural language evaluation criteria
        try:
            resp = await client.aio.models.generate_content(
                model='gemini-2.5-flash',
                contents=f"Category: {category}\nTask: {task_description}",
                config=types.GenerateContentConfig(
                    system_instruction=NON_CODE_SYSTEM_PROMPT,
                    temperature=0.3
                )
            )
            criteria = resp.text.strip()
            if criteria.startswith("```"):
                lines = criteria.split("\n")
                criteria = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])

            criterion_count = sum(1 for line in criteria.splitlines() if line.strip() and line.strip()[0].isdigit())
            if criterion_count < 3:
                warnings.append("Few criteria generated. Consider adding more specific requirements.")

            return {
                "tests": criteria,
                "test_count": criterion_count,
                "covers_edge_cases": True,
                "warnings": warnings
            }
        except Exception as e:
            return {"tests": "", "test_count": 0, "covers_edge_cases": False,
                    "warnings": [f"Generation failed: {e}. Write criteria manually."]}

    # Code bounty: generate pytest unit tests
    SYSTEM_PROMPT = """You are an expert test engineer. Generate pytest unit tests for the task described.
RULES:
1. Generate 5-8 test functions covering happy path, edge cases, errors
2. Tests must be deterministic — no randomness
3. Use only stdlib + pytest — no external imports
4. Each test has a docstring
5. Return ONLY valid Python code — no markdown, no backticks
6. Function to test is named 'solution'
7. Import with: from solution import solution"""

    try:
        resp = await client.aio.models.generate_content(
            model='gemini-2.5-flash',
            contents=f"Task: {task_description}",
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                temperature=0.2
            )
        )
        tests = resp.text.strip()
        if tests.startswith("```"):
            lines = tests.split("\n")
            tests = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])

        test_count = tests.count("def test_")
        if test_count == 0:
            warnings.append("No test functions detected")
        elif test_count < 5:
            warnings.append(f"Only {test_count} tests. Minimum recommended: 5.")

        edge_kw = ["edge", "zero", "empty", "negative", "large", "none", "boundary", "error"]
        covers_edge = any(k in tests.lower() for k in edge_kw)
        if not covers_edge:
            warnings.append("May not cover edge cases.")

        return {"tests": tests, "test_count": test_count, "covers_edge_cases": covers_edge, "warnings": warnings}
    except Exception as e:
        return {"tests": "", "test_count": 0, "covers_edge_cases": False,
                "warnings": [f"Generation failed: {e}. Write tests manually."]}


async def validate_tests(test_code: str) -> dict:
    """Validate test code: syntax, safety, and that tests actually fail against dummy."""
    issues = []
    try:
        tree = ast.parse(test_code)
    except SyntaxError as e:
        return {"valid": False, "reason": f"Syntax error line {e.lineno}: {e.msg}", "issues": [str(e)]}

    test_funcs = [n.name for n in ast.walk(tree) if isinstance(n, ast.FunctionDef) and n.name.startswith("test_")]
    if not test_funcs:
        return {"valid": False, "reason": "No test_ functions found", "issues": ["No tests"]}

    bad_mods = {"subprocess", "os", "sys", "socket", "ctypes", "pickle", "shutil", "signal"}
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for a in node.names:
                if a.name.split(".")[0] in bad_mods:
                    issues.append(f"Dangerous import: {a.name}")
        if isinstance(node, ast.ImportFrom) and node.module:
            if node.module.split(".")[0] in bad_mods:
                issues.append(f"Dangerous import: from {node.module}")
    if issues:
        return {"valid": False, "reason": f"Dangerous imports: {', '.join(issues)}", "issues": issues}

    # Run against dummy to verify tests fail (meaning they test something real)
    tmpdir = tempfile.mkdtemp(prefix="vortex_val_")
    try:
        with open(os.path.join(tmpdir, "solution.py"), "w") as f:
            f.write("def solution(*a, **kw): return None\n")
        with open(os.path.join(tmpdir, "test_solution.py"), "w") as f:
            f.write(f"import sys\nsys.path.insert(0,'{tmpdir}')\n{test_code}")
        r = subprocess.run(["python", "-m", "pytest", os.path.join(tmpdir, "test_solution.py"), "--tb=no", "-q"],
                           capture_output=True, text=True, timeout=15, cwd=tmpdir)
        if r.returncode == 0:
            issues.append("Tests pass against dummy — may not be testing anything")
    except Exception as e:
        issues.append(f"Validation error: {e}")
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)

    return {"valid": len(issues) == 0, "reason": "Valid" if not issues else "; ".join(issues), "issues": issues}


async def improve_tests(tests: str, feedback: str) -> str:
    """Improve existing tests with buyer feedback."""
    try:
        resp = await client.aio.models.generate_content(
            model='gemini-2.5-flash',
            contents=f"Existing tests:\n```python\n{tests}\n```\nFeedback: {feedback}\nReturn improved code only.",
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                temperature=0.2
            )
        )
        improved = resp.text.strip()
        if improved.startswith("```"):
            lines = improved.split("\n")
            improved = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
        return improved
    except Exception:
        return tests

async def evaluate_requirements(description: str, criteria: str) -> dict:
    """Analyze the buyer's scope for subjectivity and ambiguity."""
    try:
        resp = await client.aio.models.generate_content(
            model='gemini-2.5-flash',
            contents=f"Description: {description}\nCriteria: {criteria}",
            config=types.GenerateContentConfig(
                system_instruction='''You are the Sovereign AI Escrow Officer. Analyze the task requirements for subjectivity.
Rules:
1. Reject ambiguous terms (e.g., "fast", "looks good", "high quality", "clean code", "responsive", "smooth").
2. Only allow mathematically verifiable, testable, or purely binary criteria.
3. Return JSON: { "is_sealed": bool, "score": int (0-100, >75 is pass), "flags": [{ "type": string, "issue": string }] }
If the text lacks sufficient objective detail, fail it.''',
                temperature=0.1,
                response_mime_type="application/json"
            )
        )
        data = resp.text.strip()
        return json.loads(data)
    except Exception as e:
        return {"is_sealed": False, "score": 0, "flags": [{"type": "error", "issue": f"Sealer AI offline: {str(e)}"}]}

async def refine_requirements(description: str, requirements: str) -> dict:
    """Transform ambiguous text into objective, testable criteria."""
    try:
        prompt = f"Description: {description}\nCurrent Requirements: {requirements}"
        resp = await client.aio.models.generate_content(
            model='gemini-2.0-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction="""You are the Sovereign AI Scope Refiner. 
Your goal is to eliminate ambiguity and subjectivity.
1. Rewrite the description to be purely functional.
2. Transform 'fast', 'clean', 'high quality' into specific, measurable constraints (e.g. 'Runtime < 200ms', '0 linting errors').
3. For Python tasks, define specific input/output types.
Return JSON: { "refined_description": string, "refined_requirements": string, "logic_constraints": [string] }""",
                temperature=0.2,
                response_mime_type="application/json"
            )
        )
        return json.loads(resp.text.strip())
    except Exception as e:
        return {"refined_description": description, "refined_requirements": requirements, "logic_constraints": [f"Refinement failed: {str(e)}"]}
async def summarize_criteria(criteria: str) -> list:
    """Summarize verification code into human logic constraints."""
    try:
        resp = await client.aio.models.generate_content(
            model='gemini-2.0-flash',
            contents=f"Summarize these pytest checks into 3-5 bullet points for a developer:\n\n{criteria}",
            config=types.GenerateContentConfig(
                system_instruction="Return ONLY a JSON array of strings. No markdown.",
                temperature=0.1,
                response_mime_type="application/json"
            )
        )
        return json.loads(resp.text.strip())
    except Exception:
        return ["Protocol verification active (Pytest)"]


async def analyze_failure(code: str, tests: str, logs: str) -> dict:
    """Analyze failing code vs tests and provide forensic feedback."""
    try:
        prompt = f"Failed Code:\n{code}\n\nTests:\n{tests}\n\nExecution Logs:\n{logs}"
        resp = await client.aio.models.generate_content(
            model='gemini-2.0-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction="""You are the Sovereign Forensic Analyst.
Identify why the code failed the protocol tests.
Return JSON: { "summary": string, "issues": [{ "line": int, "type": string, "message": string, "fix_hint": string }] }
Be precise and professional.""",
                temperature=0.1,
                response_mime_type="application/json"
            )
        )
        return json.loads(resp.text.strip())
    except Exception as e:
        return {"summary": "Forensic analysis failed.", "issues": [{"line": 0, "type": "error", "message": str(e), "fix_hint": "Check console logs"}]}
