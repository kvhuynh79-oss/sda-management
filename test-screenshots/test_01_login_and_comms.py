"""Test 01: Login flow + Communications page navigation"""
from playwright.sync_api import sync_playwright
import os, time

SCREENSHOTS_DIR = r"c:\Projects\sda-management\test-screenshots"
os.makedirs(SCREENSHOTS_DIR, exist_ok=True)

def login(page):
    page.goto("http://localhost:3000/login")
    page.wait_for_load_state("networkidle")
    page.fill('input[type="email"]', "khen@betterlivingsolutions.com.au")
    page.fill('input[type="password"]', "Ay38uw!@")
    page.click('button[type="submit"]')
    page.wait_for_url("**/dashboard**", timeout=15000)
    page.wait_for_load_state("networkidle")

results = []

def log(test_name, passed, detail=""):
    status = "PASS" if passed else "FAIL"
    results.append(f"[{status}] {test_name}: {detail}")
    print(f"[{status}] {test_name}: {detail}")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1440, "height": 900})
    page = context.new_page()

    # --- Test 1: Login ---
    try:
        login(page)
        page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "01_dashboard_after_login.png"))
        log("Login", True, "Successfully logged in and reached dashboard")
    except Exception as e:
        page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "01_login_FAIL.png"))
        log("Login", False, str(e))

    # --- Test 2: Navigate to Communications page ---
    try:
        page.click('a[href="/communications"]')
        page.wait_for_load_state("networkidle")
        time.sleep(2)
        page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "02_communications_page.png"))

        # Check page title
        title = page.text_content("h1")
        assert title and "Communications" in title, f"Expected 'Communications' in title, got: {title}"
        log("Communications page load", True, f"Title: {title}")
    except Exception as e:
        page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "02_communications_FAIL.png"))
        log("Communications page load", False, str(e))

    # --- Test 3: Check StatsHeader is present ---
    try:
        stats_cards = page.query_selector_all('[class*="grid"]')
        page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "03_stats_header.png"))
        log("Stats Header present", len(stats_cards) > 0, f"Found {len(stats_cards)} grid sections")
    except Exception as e:
        log("Stats Header present", False, str(e))

    # --- Test 4: Check ViewToggle tabs ---
    try:
        # Look for tab buttons (Thread, Timeline, Stakeholder, Compliance, Tasks)
        tabs = page.query_selector_all('[role="tab"], [role="tablist"] button')
        if not tabs:
            # Try alternative: look for buttons with tab-like text
            tabs = page.query_selector_all('button:has-text("Thread"), button:has-text("Timeline"), button:has-text("Stakeholder"), button:has-text("Compliance"), button:has-text("Tasks")')
        tab_texts = [t.text_content().strip() for t in tabs if t.text_content()]
        page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "04_view_tabs.png"))
        log("View Toggle tabs", len(tabs) >= 4, f"Found tabs: {tab_texts}")
    except Exception as e:
        log("View Toggle tabs", False, str(e))

    # --- Test 5: Check '+ New Communication' button ---
    try:
        new_btn = page.query_selector('a[href="/follow-ups/communications/new"]')
        assert new_btn is not None, "New Communication button not found"
        btn_text = new_btn.text_content().strip()
        log("New Communication button", True, f"Button text: {btn_text}")
    except Exception as e:
        log("New Communication button", False, str(e))

    # --- Test 6: Thread Status filter tabs (Active/Completed/Archived) ---
    try:
        status_tabs = page.query_selector_all('[role="radiogroup"] [role="radio"]')
        if not status_tabs:
            # Also try just looking for the buttons with those texts
            status_tabs = page.query_selector_all('[role="radiogroup"] button')
        tab_texts = [t.text_content().strip() for t in status_tabs]
        page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "05_thread_status_tabs.png"))
        has_all = "Active" in tab_texts and "Completed" in tab_texts and "Archived" in tab_texts
        log("Thread Status tabs", has_all, f"Found: {tab_texts}")
    except Exception as e:
        log("Thread Status tabs", False, str(e))

    # --- Test 7: Click 'Completed' status tab ---
    try:
        completed_btn = page.query_selector('[role="radio"]:has-text("Completed")')
        if completed_btn:
            completed_btn.click()
            time.sleep(1.5)
            page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "06_thread_completed_tab.png"))
            # Check URL has threadStatus=completed
            url = page.url
            log("Completed status tab click", "threadStatus=completed" in url or "Completed" in (completed_btn.get_attribute("aria-checked") or ""), f"URL: {url}")
        else:
            log("Completed status tab click", False, "Completed radio button not found")
    except Exception as e:
        log("Completed status tab click", False, str(e))

    # --- Test 8: Click 'Archived' status tab ---
    try:
        archived_btn = page.query_selector('[role="radio"]:has-text("Archived")')
        if archived_btn:
            archived_btn.click()
            time.sleep(1.5)
            page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "07_thread_archived_tab.png"))
            url = page.url
            log("Archived status tab click", "threadStatus=archived" in url, f"URL: {url}")
        else:
            log("Archived status tab click", False, "Archived radio button not found")
    except Exception as e:
        log("Archived status tab click", False, str(e))

    # --- Test 9: Click back to 'Active' status tab ---
    try:
        active_btn = page.query_selector('[role="radio"]:has-text("Active")')
        if active_btn:
            active_btn.click()
            time.sleep(1.5)
            page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "08_thread_active_tab.png"))
            url = page.url
            # Active is default so threadStatus param may be removed
            log("Active status tab click", "threadStatus" not in url or "threadStatus=active" in url, f"URL: {url}")
        else:
            log("Active status tab click", False, "Active radio button not found")
    except Exception as e:
        log("Active status tab click", False, str(e))

    # --- Test 10: Check Deleted Items button (admin only) ---
    try:
        deleted_btn = page.query_selector('button:has-text("Deleted Items")')
        page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "09_deleted_items_button.png"))
        log("Deleted Items button (admin)", deleted_btn is not None, "Button found" if deleted_btn else "Button NOT found (may not be admin)")
    except Exception as e:
        log("Deleted Items button (admin)", False, str(e))

    # --- Test 11: Click Deleted Items button ---
    try:
        deleted_btn = page.query_selector('button:has-text("Deleted Items")')
        if deleted_btn:
            deleted_btn.click()
            time.sleep(1.5)
            page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "10_deleted_items_panel.png"))
            # Check panel is visible
            panel_header = page.query_selector('h2:has-text("Deleted Communications")')
            log("Deleted Items panel opens", panel_header is not None, "Panel header found" if panel_header else "Panel header NOT found")
        else:
            log("Deleted Items panel opens", False, "Deleted Items button not found")
    except Exception as e:
        log("Deleted Items panel opens", False, str(e))

    # --- Test 12: Switch to Timeline view ---
    try:
        timeline_btn = page.query_selector('button:has-text("Timeline")')
        if timeline_btn:
            timeline_btn.click()
            time.sleep(2)
            page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "11_timeline_view.png"))
            url = page.url
            log("Timeline view", "view=timeline" in url, f"URL: {url}")
        else:
            log("Timeline view", False, "Timeline tab button not found")
    except Exception as e:
        log("Timeline view", False, str(e))

    # --- Test 13: Switch to Stakeholder view ---
    try:
        stakeholder_btn = page.query_selector('button:has-text("Stakeholder")')
        if stakeholder_btn:
            stakeholder_btn.click()
            time.sleep(2)
            page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "12_stakeholder_view.png"))
            url = page.url
            log("Stakeholder view", "view=stakeholder" in url, f"URL: {url}")
        else:
            log("Stakeholder view", False, "Stakeholder tab button not found")
    except Exception as e:
        log("Stakeholder view", False, str(e))

    # --- Test 14: Switch to Compliance view ---
    try:
        compliance_btn = page.query_selector('button:has-text("Compliance")')
        if compliance_btn:
            compliance_btn.click()
            time.sleep(2)
            page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "13_compliance_view.png"))
            url = page.url
            log("Compliance view", "view=compliance" in url, f"URL: {url}")
        else:
            log("Compliance view", False, "Compliance tab button not found")
    except Exception as e:
        log("Compliance view", False, str(e))

    # --- Test 15: Switch to Tasks view ---
    try:
        tasks_btn = page.query_selector('button:has-text("Tasks")')
        if tasks_btn:
            tasks_btn.click()
            time.sleep(2)
            page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "14_tasks_view.png"))
            url = page.url
            log("Tasks view", "view=tasks" in url, f"URL: {url}")
        else:
            log("Tasks view", False, "Tasks tab button not found")
    except Exception as e:
        log("Tasks view", False, str(e))

    # --- Test 16: Filter sidebar present ---
    try:
        page.click('button:has-text("Thread")') if page.query_selector('button:has-text("Thread")') else None
        time.sleep(1)
        # Check for filter sidebar (look for Filters heading or sidebar container)
        sidebar = page.query_selector('aside, [class*="FilterSidebar"], div:has-text("Filters")')
        page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "15_filter_sidebar.png"))
        log("Filter sidebar", sidebar is not None, "Sidebar element found" if sidebar else "Sidebar NOT found")
    except Exception as e:
        log("Filter sidebar", False, str(e))

    browser.close()

print("\n" + "="*60)
print("TEST RESULTS SUMMARY")
print("="*60)
passed = sum(1 for r in results if r.startswith("[PASS]"))
failed = sum(1 for r in results if r.startswith("[FAIL]"))
print(f"\nTotal: {len(results)} | Passed: {passed} | Failed: {failed}")
print()
for r in results:
    print(r)
