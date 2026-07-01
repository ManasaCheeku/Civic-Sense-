import os
import sys

# Ensure the repository root is available on sys.path so imports such as
# `from ai.report_generator import ...` work when the backend is started from
# the backend directory.
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir, os.pardir))
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)
