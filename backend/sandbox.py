"""
VORTEX Sandbox Engine
=====================
Docker container execution with full security isolation.
Pre-pulled image eliminates cold start time.

DESIGN NOTE: Use pre-pulled image to eliminate 15-20s Docker pull time.
Pull python:3.9-alpine on server startup.
"""

import os
import time
import uuid
import shutil
import tempfile
import logging
from typing import Optional

import docker
from docker.errors import ContainerError, ImageNotFound, APIError

logger = logging.getLogger("vortex.sandbox")

# Docker image — pre-pulled at startup
SANDBOX_IMAGE = "python:3.9-alpine"
SANDBOX_TIMEOUT = 45  # Hard timeout in seconds


def preload_docker_image():
    """
    Called at FastAPI startup.
    Pre-pulls the sandbox image and installs pytest to eliminate cold start.
    """
    try:
        client = docker.from_env()
        logger.info(f"Pulling {SANDBOX_IMAGE}...")
        start = time.time()
        client.images.pull(SANDBOX_IMAGE)
        elapsed = time.time() - start
        logger.info(f"Image pulled in {elapsed:.1f}s")

        # Build a custom image with pytest pre-installed
        # This eliminates pip install time during test execution
        logger.info("Building sandbox image with pytest...")
        dockerfile = f"""
FROM {SANDBOX_IMAGE}
RUN pip install --no-cache-dir pytest==8.3.3
"""
        # Write Dockerfile to temp dir
        tmpdir = tempfile.mkdtemp(prefix="vortex_build_")
        dockerfile_path = os.path.join(tmpdir, "Dockerfile")
        with open(dockerfile_path, "w") as f:
            f.write(dockerfile)

        client.images.build(
            path=tmpdir,
            tag="vortex-sandbox:latest",
            rm=True,
            forcerm=True,
        )
        shutil.rmtree(tmpdir, ignore_errors=True)
        logger.info("Sandbox image ready: vortex-sandbox:latest")
        return True

    except Exception as e:
        logger.error(f"Failed to preload Docker image: {e}")
        logger.warning("Sandbox will attempt to pull image on first use")
        return False


def run_in_sandbox(code: str, test_code: str) -> dict:
    """
    Execute submitted code against unit tests in an isolated Docker container.
    
    Security design:
    - network_disabled: prevents data exfiltration to external servers
    - mem_limit 128m: prevents memory exhaustion / OOM attacks
    - memswap_limit 128m: prevents swap abuse
    - pids_limit 50: prevents fork bomb attacks
    - read_only: prevents filesystem write attacks / persistence
    - user nobody: drops root privileges
    - cap_drop ALL: removes ALL Linux capabilities (mount, network admin, etc.)
    - no-new-privileges: prevents privilege escalation via setuid binaries
    - cpu_quota 50%: prevents CPU starvation of host
    
    Returns:
        {
            pass: bool,
            tests_passed: int,
            tests_failed: int,
            test_results: [{name, status, time}],
            logs: str,
            duration_seconds: float,
            timeout: bool,
            docker_error: str|None
        }
    """
    container = None
    tmpdir = None

    try:
        client = docker.from_env()

        # ── Pre-flight: Verify image exists ──
        image_name = "vortex-sandbox:latest"
        try:
            client.images.get(image_name)
        except ImageNotFound:
            # Fallback to base image
            image_name = SANDBOX_IMAGE
            try:
                client.images.get(image_name)
            except ImageNotFound:
                client.images.pull(image_name)

        # ── Create temp directory with solution + tests ──
        tmpdir = tempfile.mkdtemp(prefix="vortex_sandbox_")
        solution_path = os.path.join(tmpdir, "solution.py")
        test_path = os.path.join(tmpdir, "test_solution.py")

        with open(solution_path, "w", encoding="utf-8") as f:
            f.write(code)

        # Prepend path injection so tests can import solution
        test_header = """import sys
sys.path.insert(0, '/sandbox')
from solution import *

"""
        with open(test_path, "w", encoding="utf-8") as f:
            f.write(test_header + test_code)

        # ── Run container with full security isolation ──
        start_time = time.time()

        container = client.containers.run(
            image=image_name,
            command=["sh", "-c", "cd /sandbox && python -m pytest test_solution.py -v --tb=short --no-header -p no:cacheprovider 2>&1"],
            volumes={tmpdir: {"bind": "/sandbox", "mode": "ro"}},  # Read-only mount
            tmpfs={"/tmp": "size=16m,noexec"},  # Writable tmpfs for pytest's FDCapture temp files
            working_dir="/sandbox",
            network_disabled=True,     # Prevents data exfiltration to external servers
            mem_limit="128m",          # Prevents memory exhaustion / OOM attacks
            memswap_limit="128m",      # Prevents swap abuse
            cpu_period=100000,
            cpu_quota=50000,           # 50% CPU cap — prevents CPU starvation of host
            pids_limit=50,             # Prevents fork bomb attacks
            read_only=True,            # Prevents filesystem write attacks / persistence
            user="nobody",             # Drops root privileges
            security_opt=["no-new-privileges:true"],  # Prevents privilege escalation via setuid
            cap_drop=["ALL"],          # Removes ALL Linux capabilities
            detach=True,
            stdout=True,
            stderr=True,
        )

        # Wait for container with hard timeout
        try:
            result = container.wait(timeout=SANDBOX_TIMEOUT)
        except Exception:
            # Timeout — kill container
            try:
                container.kill()
            except Exception:
                pass
            duration = time.time() - start_time
            return {
                "pass": False,
                "tests_passed": 0,
                "tests_failed": 0,
                "test_results": [],
                "logs": f"TIMEOUT: Execution exceeded {SANDBOX_TIMEOUT}s limit",
                "duration_seconds": round(duration, 2),
                "timeout": True,
                "docker_error": None,
            }

        duration = time.time() - start_time

        # ── Parse output ──
        logs = container.logs(stdout=True, stderr=True).decode("utf-8", errors="replace")
        exit_code = result.get("StatusCode", 1)

        test_results = _parse_pytest_output(logs)
        tests_passed = sum(1 for t in test_results if t["status"] == "PASSED")
        tests_failed = sum(1 for t in test_results if t["status"] == "FAILED")

        # Check for import errors (common failure mode)
        has_import_error = "ImportError" in logs or "ModuleNotFoundError" in logs

        passed = exit_code == 0 and tests_failed == 0 and not has_import_error

        return {
            "pass": passed,
            "tests_passed": tests_passed,
            "tests_failed": tests_failed,
            "test_results": test_results,
            "logs": logs,
            "duration_seconds": round(duration, 2),
            "timeout": False,
            "docker_error": None,
        }

    except APIError as e:
        return {
            "pass": False,
            "tests_passed": 0,
            "tests_failed": 0,
            "test_results": [],
            "logs": "",
            "duration_seconds": 0,
            "timeout": False,
            "docker_error": f"Docker API error: {str(e)}",
        }

    except Exception as e:
        return {
            "pass": False,
            "tests_passed": 0,
            "tests_failed": 0,
            "test_results": [],
            "logs": "",
            "duration_seconds": 0,
            "timeout": False,
            "docker_error": f"Sandbox error: {str(e)}",
        }

    finally:
        # ── Cleanup: Always remove container and temp directory ──
        if container:
            try:
                container.remove(force=True)
            except Exception:
                pass
        if tmpdir:
            try:
                shutil.rmtree(tmpdir, ignore_errors=True)
            except Exception:
                pass


def _parse_pytest_output(output: str) -> list:
    """Parse pytest verbose output into structured test results."""
    results = []
    for line in output.split("\n"):
        line = line.strip()
        if not line:
            continue

        # Match pytest verbose format: "test_name PASSED" or "test_name FAILED"
        if " PASSED" in line:
            name = line.split(" PASSED")[0].strip()
            # Extract test function name (after ::)
            if "::" in name:
                name = name.split("::")[-1]
            results.append({"name": name, "status": "PASSED", "time": None})

        elif " FAILED" in line:
            name = line.split(" FAILED")[0].strip()
            if "::" in name:
                name = name.split("::")[-1]
            results.append({"name": name, "status": "FAILED", "time": None})

        elif " ERROR" in line:
            name = line.split(" ERROR")[0].strip()
            if "::" in name:
                name = name.split("::")[-1]
            results.append({"name": name, "status": "ERROR", "time": None})

    return results


def check_docker_available() -> bool:
    """Check if Docker daemon is running and accessible."""
    try:
        client = docker.from_env()
        client.ping()
        return True
    except Exception:
        return False
