#!/usr/bin/env python3
"""Build the synthetic portfolio site with CSP-compatible static assets."""
from pathlib import Path
import re
import shutil
import subprocess

ROOT = Path(__file__).resolve().parent.parent


def main():
    skeleton = (ROOT / "src" / "guest-skeleton.html").read_text()
    data = (ROOT / "src" / "demo-data.js").read_text()
    app = (ROOT / "src" / "guest-app.js").read_text()
    banner_css = """
.portfolio-demo-banner{position:relative;z-index:1000;padding:9px 16px;text-align:center;background:#071c35;color:#f6fbff;font:600 12px/1.4 system-ui,sans-serif;letter-spacing:.02em}
"""
    style_match = re.search(r"^<style>\s*(.*?)\s*</style>$", skeleton, re.S | re.M)
    if not style_match:
        raise RuntimeError("Expected exactly one inline style block")
    stylesheet = style_match.group(1) + "\n" + (ROOT / "src" / "guest-event-theme.css").read_text() + "\n" + banner_css.strip() + "\n"
    output = skeleton[:style_match.start()] + '<link rel="stylesheet" href="/styles.css">' + skeleton[style_match.end():]
    output, count = re.subn(
        r"<script>\s*</script>",
        '<script src="/app.js" defer></script>',
        output,
        count=1,
    )
    if count != 1:
        raise RuntimeError("Expected exactly one empty script placeholder")
    site = ROOT / "site"
    site.mkdir(exist_ok=True)
    (site / "index.html").write_text(output)
    (site / "styles.css").write_text(stylesheet)
    (site / "app.js").write_text(data + "\n\n" + app + "\n")
    (site / "telemetry.js").write_text((ROOT / "src" / "telemetry.js").read_text())
    shutil.copyfile(
        ROOT / "src" / "vendor" / "applicationinsights-web.min.js",
        site / "applicationinsights-web.min.js",
    )
    subprocess.run(["python3", str(ROOT / "build" / "privacy_check.py")], check=True)
    print(f"Built {site / 'index.html'} ({len(output):,} bytes)")


if __name__ == "__main__":
    main()
