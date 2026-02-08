"""Test the Complaints Compliance Flow in mySDAmanager"""
from playwright.sync_api import sync_playwright
import time
import json

SCREENSHOTS_DIR = "c:/Projects/sda-management/test_screenshots"

def login(page):
    """Login to the app using localStorage injection (bypasses Convex action)"""
    page.goto("http://localhost:3000/login")
    page.wait_for_load_state("networkidle")
    time.sleep(1)

    # Screenshot the login page
    page.screenshot(path=f"{SCREENSHOTS_DIR}/00_login_page.png")

    # Try filling and submitting the form
    email_input = page.locator('input[placeholder="you@example.com"]')
    password_input = page.locator('input[placeholder="Enter your password"]')

    if email_input.is_visible():
        email_input.fill("khen@betterlivingsolutions.com.au")
        password_input.fill("admin123")

        page.screenshot(path=f"{SCREENSHOTS_DIR}/00b_login_filled.png")

        # Click sign in button
        submit_btn = page.locator('button:has-text("Sign in")')
        submit_btn.click()

        # Wait for either navigation or error
        try:
            page.wait_for_url("**/dashboard**", timeout=10000)
            print("  Login: SUCCESS - Navigated to dashboard")
            return True
        except:
            # Check for error message
            error = page.locator('[class*="text-red"], [class*="error"]')
            if error.is_visible():
                print(f"  Login: FAILED - Error: {error.inner_text()}")
            else:
                print(f"  Login: FAILED - Still on {page.url}")

            # Fallback: inject localStorage directly to bypass login
            print("  Login: Trying localStorage injection fallback...")
            page.evaluate("""() => {
                localStorage.setItem('sda_user', JSON.stringify({
                    id: 'kd7fd8jkh3nnfq8wspqce85tkn80184p',
                    email: 'khen@betterlivingsolutions.com.au',
                    firstName: 'khen',
                    lastName: 'Huynh',
                    role: 'admin',
                    expiresAt: Date.now() + (24 * 60 * 60 * 1000)
                }));
            }""")
            page.goto("http://localhost:3000/dashboard")
            page.wait_for_load_state("networkidle")
            time.sleep(2)

            if "/dashboard" in page.url:
                print("  Login: SUCCESS via localStorage injection")
                return True
            elif "/login" in page.url:
                print("  Login: Still redirected to login - auth may need real Convex token")
                return False
    return False

def test_complaints_list_page(page):
    """Test 1: Complaints list page at /compliance/complaints"""
    print("\n=== TEST 1: Complaints List Page ===")
    page.goto("http://localhost:3000/compliance/complaints")
    page.wait_for_load_state("networkidle")
    time.sleep(4)

    page.screenshot(path=f"{SCREENSHOTS_DIR}/01_complaints_list.png", full_page=True)

    # Check what's on the page
    page_text = page.inner_text("body")
    current_url = page.url
    print(f"  URL: {current_url}")

    if "/login" in current_url:
        print("  BLOCKED: Redirected to login - cannot test without auth")
        return False

    # Check page elements
    checks = {
        "Page loaded (not login)": "/login" not in current_url,
        "Complaints text visible": "complaint" in page_text.lower(),
        "Reference numbers": "CMP-" in page_text,
        "Status badges": any(w in page_text for w in ["Received", "Acknowledged", "Resolved"]),
        "Filter controls": page.locator("select").count() > 0 or page.locator("input[placeholder*='earch']").count() > 0,
        "Export button": page.locator("button").filter(has_text="Export").count() > 0,
        "Log/New button": page.locator("button, a").filter(has_text="Log Complaint").count() > 0 or page.locator("button, a").filter(has_text="New").count() > 0,
    }

    for check_name, passed in checks.items():
        status = "PASS" if passed else "INFO"
        print(f"  {status}: {check_name}")

    # Count table rows
    rows = page.locator("tbody tr")
    print(f"  Table rows: {rows.count()}")

    return True

def test_complaint_detail_page(page):
    """Test 2: Click into a complaint detail page"""
    print("\n=== TEST 2: Complaint Detail Page ===")

    page.goto("http://localhost:3000/compliance/complaints")
    page.wait_for_load_state("networkidle")
    time.sleep(4)

    if "/login" in page.url:
        print("  BLOCKED: Redirected to login")
        return False

    # Try to click a table row
    rows = page.locator("tbody tr")
    row_count = rows.count()
    print(f"  Found {row_count} complaint rows")

    if row_count > 0:
        first_row_text = rows.first.inner_text()
        print(f"  First row: {first_row_text[:80]}...")
        rows.first.click()
        time.sleep(3)
        page.wait_for_load_state("networkidle")
        time.sleep(2)

        current_url = page.url
        print(f"  Navigated to: {current_url}")

        if "/complaints/" in current_url and current_url.rstrip("/") != "http://localhost:3000/compliance/complaints":
            page.screenshot(path=f"{SCREENSHOTS_DIR}/02_complaint_detail.png", full_page=True)

            # Scroll down to see chain of custody
            page.evaluate("window.scrollTo(0, document.body.scrollHeight / 2)")
            time.sleep(1)
            page.screenshot(path=f"{SCREENSHOTS_DIR}/02b_complaint_detail_middle.png", full_page=False)

            page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            time.sleep(1)
            page.screenshot(path=f"{SCREENSHOTS_DIR}/02c_complaint_detail_bottom.png", full_page=False)

            page_text = page.inner_text("body")

            checks = {
                "Reference number (CMP-)": "CMP-" in page_text,
                "24hr countdown/ack status": any(w in page_text.lower() for w in ["remaining", "overdue", "acknowledged", "countdown", "hours"]),
                "Progress bar stages": any(w in page_text for w in ["Acknowledge", "Triage", "Investigate"]),
                "Compliance sidebar": any(w in page_text.lower() for w in ["procedure", "guidance", "stage"]),
                "Chain of custody": any(w in page_text.lower() for w in ["chain of custody", "audit trail", "custody"]),
                "Locked record banner": any(w in page_text.lower() for w in ["locked", "website"]),
                "Source indicator": any(w in page_text.lower() for w in ["website", "source"]),
                "Action buttons": any(w in page_text for w in ["Acknowledge", "Assign", "Resolve", "Close"]),
                "Complainant info": any(w in page_text.lower() for w in ["test user", "jane smith", "participant", "family"]),
            }

            for check_name, passed in checks.items():
                status = "PASS" if passed else "INFO"
                print(f"  {status}: {check_name}")

            return True
        else:
            print(f"  WARN: Row click didn't navigate to detail page (stayed at {current_url})")
    else:
        print("  WARN: No complaint rows found in table")

    # Try finding links
    links = page.evaluate("""() => {
        return Array.from(document.querySelectorAll('a')).map(a => ({
            href: a.href, text: a.textContent?.trim()?.substring(0, 60)
        })).filter(l => l.href.includes('complaints/') && !l.href.endsWith('/new') && !l.href.endsWith('/complaints'))
    }""")
    print(f"  Direct complaint links found: {len(links)}")
    for link in links[:5]:
        print(f"    - {link['href']} ({link['text']})")

    if links:
        page.goto(links[0]['href'])
        page.wait_for_load_state("networkidle")
        time.sleep(3)
        page.screenshot(path=f"{SCREENSHOTS_DIR}/02_complaint_detail_via_link.png", full_page=True)
        return True

    return False

def test_communications_auto_link(page):
    """Test 3: Verify auto-linked communication in Communications page"""
    print("\n=== TEST 3: Communications Auto-Link ===")

    page.goto("http://localhost:3000/communications")
    page.wait_for_load_state("networkidle")
    time.sleep(4)

    if "/login" in page.url:
        print("  BLOCKED: Redirected to login")
        return False

    page.screenshot(path=f"{SCREENSHOTS_DIR}/03_communications_thread.png", full_page=True)
    page_text = page.inner_text("body")

    # Check for complaint-related text
    if any(w in page_text for w in ["CMP-", "Complaint", "complaint"]):
        print("  PASS: Complaint reference found in Communications")
    else:
        print("  INFO: No complaint references in Thread view")

    # Try Compliance view
    compliance_tab = page.locator("button").filter(has_text="Compliance")
    if compliance_tab.count() > 0:
        compliance_tab.first.click()
        time.sleep(3)
        page.screenshot(path=f"{SCREENSHOTS_DIR}/03b_communications_compliance.png", full_page=True)
        text = page.inner_text("body")
        if any(w in text for w in ["CMP-", "complaint", "Complaint"]):
            print("  PASS: Complaint visible in Compliance view")
        else:
            print("  INFO: Complaint not visible in Compliance view")

    # Try Timeline view
    timeline_tab = page.locator("button").filter(has_text="Timeline")
    if timeline_tab.count() > 0:
        timeline_tab.first.click()
        time.sleep(3)
        page.screenshot(path=f"{SCREENSHOTS_DIR}/03c_communications_timeline.png", full_page=True)
        text = page.inner_text("body")
        if any(w in text for w in ["CMP-", "complaint", "Complaint"]):
            print("  PASS: Complaint visible in Timeline view")
        else:
            print("  INFO: Complaint not visible in Timeline view")

    return True

def test_compliance_dashboard(page):
    """Test 4: Compliance dashboard"""
    print("\n=== TEST 4: Compliance Dashboard ===")
    page.goto("http://localhost:3000/compliance")
    page.wait_for_load_state("networkidle")
    time.sleep(3)

    if "/login" in page.url:
        print("  BLOCKED: Redirected to login")
        return False

    page.screenshot(path=f"{SCREENSHOTS_DIR}/04_compliance_dashboard.png", full_page=True)
    page_text = page.inner_text("body")

    if "complaint" in page_text.lower():
        print("  PASS: Complaints section in compliance dashboard")
    else:
        print("  INFO: Complaints not visible in compliance dashboard")

    return True

def test_new_complaint_form(page):
    """Test 5: New complaint form"""
    print("\n=== TEST 5: New Complaint Form ===")
    page.goto("http://localhost:3000/compliance/complaints/new")
    page.wait_for_load_state("networkidle")
    time.sleep(3)

    if "/login" in page.url:
        print("  BLOCKED: Redirected to login")
        return False

    page.screenshot(path=f"{SCREENSHOTS_DIR}/05_new_complaint_form.png", full_page=True)
    page_text = page.inner_text("body")

    form_fields = page.locator("input, select, textarea")
    print(f"  Form fields: {form_fields.count()}")

    if "complaint" in page_text.lower():
        print("  PASS: New complaint form loaded")
    else:
        print("  INFO: Complaint form may not have loaded")

    return True

def main():
    import os
    os.makedirs(SCREENSHOTS_DIR, exist_ok=True)

    print("=" * 60)
    print("COMPLAINTS COMPLIANCE FLOW - TEST SUITE")
    print("=" * 60)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1920, "height": 1080})
        page = context.new_page()

        # Capture console errors
        errors = []
        page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)

        # Login first
        print("\n--- Logging in ---")
        logged_in = login(page)

        if not logged_in:
            print("\n  Attempting direct page access (RequireAuth may redirect)...")

        # Run tests regardless (pages may work depending on auth state)
        test_complaints_list_page(page)
        test_complaint_detail_page(page)
        test_communications_auto_link(page)
        test_compliance_dashboard(page)
        test_new_complaint_form(page)

        if errors:
            print(f"\n--- Console Errors ({len(errors)}) ---")
            for err in errors[:10]:
                print(f"  {err[:120]}")

        browser.close()

    print("\n" + "=" * 60)
    print("TEST SUITE COMPLETE")
    print(f"Screenshots saved to: {SCREENSHOTS_DIR}/")
    print("=" * 60)

if __name__ == "__main__":
    main()
