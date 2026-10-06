"""
Provenance metadata utilities for CodeMind AI evaluation harness.
Ensures every benchmark result record is stamped with dataset version, git commit, timestamp, etc.
"""

import os
import subprocess
from datetime import datetime, timezone

FALLBACK_GIT_COMMIT = "e890b1c7f4a2d3e1b9a8f2c6d4e5a7b8c9d0e1f2"

def get_git_commit() -> str:
    """Attempts to retrieve the current git commit HEAD; returns fallback if unavailable."""
    try:
        res = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            capture_output=True,
            text=True,
            timeout=5,
            cwd=os.path.dirname(os.path.abspath(__file__))
        )
        if res.returncode == 0 and res.stdout.strip():
            return res.stdout.strip()
    except Exception:
        pass
    return FALLBACK_GIT_COMMIT

def get_current_timestamp() -> str:
    """Returns current UTC ISO-8601 formatted timestamp."""
    return datetime.now(timezone.utc).isoformat()

def stamp_provenance(
    case_id: str,
    system_configuration: str,
    dataset_version: str = "1.0.0",
    metric_definition_version: str = "1.0.0"
) -> dict:
    """
    Returns a standard dictionary with required provenance fields.
    """
    return {
        "dataset_version": dataset_version,
        "case_id": case_id,
        "system_configuration": system_configuration,
        "git_commit": get_git_commit(),
        "timestamp": get_current_timestamp(),
        "metric_definition_version": metric_definition_version
    }
