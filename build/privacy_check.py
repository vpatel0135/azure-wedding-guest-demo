#!/usr/bin/env python3
"""Fail the public build if personal-project markers or risky data appear."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent.parent
FILES = [ROOT / "src" / "demo-data.js", ROOT / "site" / "index.html"]
FORBIDDEN = {
    "phone number": re.compile(r"(?<!\d)(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}(?!\d)"),
    "email address": re.compile(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", re.I),
    "non-example street address": re.compile(r"\b\d{1,5}\s+(?!Example\b)[A-Z][A-Za-z.' -]+\s(?:Street|St|Road|Rd|Avenue|Ave|Lane|Ln|Boulevard|Blvd)\b"),
}

findings = []
for path in FILES:
    text = path.read_text()
    for label, pattern in FORBIDDEN.items():
        if pattern.search(text):
            findings.append(f"{path.relative_to(ROOT)}: {label}")

if findings:
    raise SystemExit("Privacy check failed:\n- " + "\n- ".join(findings))
print(f"Privacy check passed for {len(FILES)} public artifacts")
