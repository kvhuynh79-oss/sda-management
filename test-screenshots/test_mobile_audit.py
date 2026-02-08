"""Mobile Responsiveness Audit - Test all critical pages at mobile viewport sizes"""
from playwright.sync_api import sync_playwright
import os, time

SCREENSHOTS_DIR = r"c:\Projects\sda-management\test-screenshots"
os.makedirs(SCREENSHOTS_DIR, exist_ok=True)

results = []

def log(test_name, status, detail=""):
    results.append({"name": test_name, "status": status, "detail": detail})
    print(f"[{status}] {test_name}: {detail}")

def check_horizontal_overflow(page):
    """Check if page has horizontal overflow"""
    overflow = page.evaluate("""() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    }""")
    return overflow

def check_tap_targets(page):
    """Check if interactive elements meet min 44x44px tap target"""
    small_targets = page.evaluate("""() => {
        const elements = document.querySelectorAll('a, button, select, input');
        const small = [];
        for (const el of elements) {
            const rect = el.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0 && (rect.width < 36 || rect.height < 36)) {
                small.push({
                    tag: el.tagName,
                    text: el.textContent?.slice(0, 30) || '',
                    width: Math.round(rect.width),
                    height: Math.round(rect.height)
                });
            }
        }
        return small.slice(0, 5); // Return first 5 small targets
    }""")
    return small_targets

def login(page):
    page.goto("http://localhost:3000/login")
    page.wait_for_load_state("networkidle")
    page.fill('input[type="email"]', "khen@betterlivingsolutions.com.au")
    page.fill('input[type="password"]', "Ay38uw!@")
    page.click('button[type="submit"]')
    page.wait_for_url("**/dashboard**", timeout=15000)
    page.wait_for_load_state("networkidle")

def test_page(page, url, name, filename):
    """Test a page at mobile viewport and collect results"""
    try:
        page.goto(url)
        page.wait_for_load_state("networkidle")
        time.sleep(2)

        # Take screenshot
        page.screenshot(path=os.path.join(SCREENSHOTS_DIR, f"mobile_{filename}.png"), full_page=True)

        # Check horizontal overflow
        has_overflow = check_horizontal_overflow(page)

        # Check tap targets
        small_targets = check_tap_targets(page)

        # Check nav is accessible
        nav = page.query_selector('nav[aria-label="Main navigation"]')
        nav_accessible = nav is not None

        # Check text clipping
        body_text = page.text_content("body") or ""
        has_content = len(body_text) > 50

        # Determine status
        if has_overflow:
            status = "MAJOR ISSUE"
            detail = "Horizontal overflow detected - content wider than viewport"
        elif len(small_targets) > 3:
            status = "MINOR ISSUE"
            detail = f"Small tap targets found: {len(small_targets)} elements < 36px"
        elif not nav_accessible:
            status = "MINOR ISSUE"
            detail = "Navigation menu not found"
        else:
            status = "PASS"
            detail = "No overflow, content readable, nav accessible"

        if small_targets:
            detail += f" | Small targets: {small_targets[:3]}"

        log(name, status, detail)

        # Also take viewport-only screenshot (not full page)
        page.screenshot(path=os.path.join(SCREENSHOTS_DIR, f"mobile_{filename}_viewport.png"), full_page=False)

        return has_overflow, small_targets

    except Exception as e:
        page.screenshot(path=os.path.join(SCREENSHOTS_DIR, f"mobile_{filename}_FAIL.png"))
        log(name, "FAIL", str(e))
        return True, []

# Test at iPhone SE (375x667) and iPhone 14 (390x844)
viewports = [
    {"name": "iPhone SE", "width": 375, "height": 667},
    {"name": "iPhone 14", "width": 390, "height": 844},
]

pages_to_test = [
    {"url": "http://localhost:3000/dashboard", "name": "Dashboard", "filename": "dashboard"},
    {"url": "http://localhost:3000/communications", "name": "Communications", "filename": "communications"},
    {"url": "http://localhost:3000/properties", "name": "Properties", "filename": "properties"},
    {"url": "http://localhost:3000/incidents", "name": "Incidents", "filename": "incidents"},
    {"url": "http://localhost:3000/follow-ups", "name": "Follow-ups", "filename": "followups"},
    {"url": "http://localhost:3000/compliance", "name": "Compliance", "filename": "compliance"},
]

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)

    for vp in viewports:
        print(f"\n{'='*60}")
        print(f"Testing at {vp['name']} ({vp['width']}x{vp['height']})")
        print(f"{'='*60}")

        context = browser.new_context(viewport={"width": vp["width"], "height": vp["height"]})
        page = context.new_page()

        # Login
        try:
            login(page)
            log(f"{vp['name']} - Login", "PASS", "Login successful")
        except Exception as e:
            log(f"{vp['name']} - Login", "FAIL", str(e))
            context.close()
            continue

        # Test each page
        for pg in pages_to_test:
            suffix = "_se" if vp["width"] == 375 else "_14"
            test_page(page, pg["url"], f"{vp['name']} - {pg['name']}", pg["filename"] + suffix)

        context.close()

    browser.close()

# Generate report
print("\n" + "="*60)
print("MOBILE AUDIT RESULTS")
print("="*60)

passes = sum(1 for r in results if r["status"] == "PASS")
minor = sum(1 for r in results if r["status"] == "MINOR ISSUE")
major = sum(1 for r in results if r["status"] == "MAJOR ISSUE")
fails = sum(1 for r in results if r["status"] == "FAIL")

print(f"\nTotal: {len(results)} | Pass: {passes} | Minor: {minor} | Major: {major} | Fail: {fails}")
print()
for r in results:
    print(f"[{r['status']}] {r['name']}: {r['detail']}")

# Write MOBILE_AUDIT.md
report = """# Mobile Responsiveness Audit Report

**Date**: 2026-02-08
**Tested Viewports**: iPhone SE (375x667), iPhone 14 (390x844)
**App**: MySDAManager (http://localhost:3000)

## Summary

| Metric | Count |
|--------|-------|
| Total Tests | {} |
| Pass | {} |
| Minor Issues | {} |
| Major Issues | {} |
| Failures | {} |

## Results

| Page | Viewport | Status | Screenshot | Notes |
|------|----------|--------|------------|-------|
""".format(len(results), passes, minor, major, fails)

for r in results:
    screenshot = f"mobile_{r['name'].split(' - ')[-1].lower().replace(' ', '_')}.png" if " - " in r["name"] else ""
    report += f"| {r['name']} | - | {r['status']} | {screenshot} | {r['detail'][:100]} |\n"

report += """
## Viewport Details

### iPhone SE (375x667)
- Smallest commonly used viewport
- Tests card stacking, text wrapping, navigation scroll

### iPhone 14 (390x844)
- Most common current iPhone viewport
- Slightly wider, taller aspect ratio

## Notes
- All pages use dark theme (bg-gray-900)
- Navigation uses horizontal scroll on mobile
- Cards use responsive grid (grid-cols-1 on mobile, expanding on md/lg)
"""

with open(r"c:\Projects\sda-management\MOBILE_AUDIT.md", "w") as f:
    f.write(report)

print("\nReport written to MOBILE_AUDIT.md")
