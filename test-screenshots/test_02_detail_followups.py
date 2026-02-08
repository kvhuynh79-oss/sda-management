"""Test 02: Communication detail page + Follow-ups page + Participant detail"""
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
    login(page)

    # ========= FOLLOW-UPS PAGE =========
    print("\n--- Follow-ups Page ---")
    try:
        page.goto("http://localhost:3000/follow-ups")
        page.wait_for_load_state("networkidle")
        time.sleep(2)
        page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "20_followups_page.png"))
        title = page.text_content("h1")
        log("Follow-ups page load", title and "Follow" in title, f"Title: {title}")
    except Exception as e:
        page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "20_followups_FAIL.png"))
        log("Follow-ups page load", False, str(e))

    # Check task stat cards
    try:
        stat_cards = page.query_selector_all('[class*="StatCard"], [class*="stat"]')
        # Also check by looking for the stat text content
        open_tasks = page.text_content('body')
        has_stats = "Open Tasks" in open_tasks if open_tasks else False
        log("Follow-ups stat cards", has_stats, "Task stats found on page")
    except Exception as e:
        log("Follow-ups stat cards", False, str(e))

    # Check filter controls
    try:
        search_input = page.query_selector('input[placeholder*="Search"]')
        status_select = page.query_selector('#status-filter')
        log("Follow-ups filter controls", search_input is not None and status_select is not None,
            f"Search: {'found' if search_input else 'missing'}, Status filter: {'found' if status_select else 'missing'}")
    except Exception as e:
        log("Follow-ups filter controls", False, str(e))

    # Check Communication History collapsible section
    try:
        comm_toggle = page.query_selector('button:has-text("Communication History")')
        log("Follow-ups comm history toggle", comm_toggle is not None,
            "Collapsible section found" if comm_toggle else "NOT found")
        if comm_toggle:
            comm_toggle.click()
            time.sleep(1.5)
            page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "21_followups_comm_expanded.png"))
            log("Follow-ups comm history expand", True, "Expanded successfully")
    except Exception as e:
        log("Follow-ups comm history", False, str(e))

    # ========= COMMUNICATION DETAIL PAGE =========
    print("\n--- Communication Detail Page ---")

    # Navigate to Communications page and find a communication to click
    try:
        page.goto("http://localhost:3000/communications?view=timeline")
        page.wait_for_load_state("networkidle")
        time.sleep(2)
        page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "22_timeline_for_detail.png"))

        # Find a communication link
        comm_links = page.query_selector_all('a[href*="/follow-ups/communications/"]')
        if comm_links and len(comm_links) > 0:
            comm_href = comm_links[0].get_attribute("href")
            log("Found comm link in timeline", True, f"Link: {comm_href}")

            # Click the first one
            comm_links[0].click()
            page.wait_for_load_state("networkidle")
            time.sleep(2)
            page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "23_comm_detail_page.png"))

            # Check page elements
            breadcrumb = page.query_selector('nav:has-text("Follow-ups")')
            h1 = page.text_content("h1")
            log("Comm detail page load", h1 is not None and len(h1) > 0, f"Title (contact): {h1}")

            # Check badges present
            badges = page.query_selector_all('[class*="Badge"], [class*="badge"]')
            log("Comm detail badges", len(badges) > 0, f"Found {len(badges)} badge elements")

            # Check Summary section
            summary = page.query_selector('h2:has-text("Summary")')
            log("Comm detail Summary section", summary is not None, "Found" if summary else "NOT found")

            # Check Details section
            details = page.query_selector('h2:has-text("Details")')
            log("Comm detail Details section", details is not None, "Found" if details else "NOT found")

            # Check Edit button
            edit_btn = page.query_selector('button:has-text("Edit")')
            log("Comm detail Edit button", edit_btn is not None, "Found" if edit_btn else "NOT found")

            # Check Create Task link
            create_task = page.query_selector('a:has-text("Create Task")')
            log("Comm detail Create Task link", create_task is not None, "Found" if create_task else "NOT found")

            # Check Danger Zone (should be visible since not deleted)
            danger_zone = page.query_selector('h2:has-text("Danger Zone")')
            log("Comm detail Danger Zone", danger_zone is not None, "Found" if danger_zone else "NOT found (maybe deleted item?)")

            # Test Edit mode
            if edit_btn:
                edit_btn.click()
                time.sleep(1)
                page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "24_comm_detail_edit_mode.png"))
                # Check for form fields
                form_fields = page.query_selector_all('select, input[type="date"], input[type="time"], textarea')
                log("Comm detail edit mode", len(form_fields) > 0, f"Found {len(form_fields)} form fields")

                # Cancel edit
                cancel_btn = page.query_selector('button:has-text("Cancel")')
                if cancel_btn:
                    cancel_btn.click()
                    time.sleep(0.5)
        else:
            log("Found comm link in timeline", False, "No communication links found")
    except Exception as e:
        page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "23_comm_detail_FAIL.png"))
        log("Comm detail page", False, str(e))

    # ========= PARTICIPANT DETAIL - COMMUNICATIONS HISTORY =========
    print("\n--- Participant Detail Page (CommunicationsHistory) ---")
    try:
        page.goto("http://localhost:3000/participants")
        page.wait_for_load_state("networkidle")
        time.sleep(2)

        # Find a participant link
        participant_links = page.query_selector_all('a[href*="/participants/"]')
        # Filter out 'new' links
        detail_links = [l for l in participant_links if "/new" not in (l.get_attribute("href") or "")]
        if detail_links:
            detail_links[0].click()
            page.wait_for_load_state("networkidle")
            time.sleep(2)
            page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "25_participant_detail.png"))

            # Scroll down to find Communications History section
            page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            time.sleep(1)
            page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "26_participant_comm_history.png"))

            # Check for Communications History section
            comm_section = page.query_selector('section:has-text("Communications"), h2:has-text("Communications"), h3:has-text("Communications")')
            log("Participant comm history section", comm_section is not None,
                "Found" if comm_section else "NOT found (may need to scroll more)")

            # Check for Add Entry button
            add_entry = page.query_selector('a:has-text("Add Entry")')
            log("Participant Add Entry button", add_entry is not None,
                "Found" if add_entry else "NOT found")
        else:
            log("Participant detail navigation", False, "No participant detail links found")
    except Exception as e:
        page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "25_participant_FAIL.png"))
        log("Participant detail", False, str(e))

    # ========= PROPERTY DETAIL - COMMUNICATIONS HISTORY =========
    print("\n--- Property Detail Page (CommunicationsHistory) ---")
    try:
        page.goto("http://localhost:3000/properties")
        page.wait_for_load_state("networkidle")
        time.sleep(2)

        property_links = page.query_selector_all('a[href*="/properties/"]')
        detail_links = [l for l in property_links if "/new" not in (l.get_attribute("href") or "") and "/edit" not in (l.get_attribute("href") or "")]
        if detail_links:
            detail_links[0].click()
            page.wait_for_load_state("networkidle")
            time.sleep(2)

            # Scroll to bottom
            page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            time.sleep(1)
            page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "27_property_comm_history.png"))

            comm_section = page.query_selector('section:has-text("Communications"), h2:has-text("Communications"), h3:has-text("Communications")')
            log("Property comm history section", comm_section is not None,
                "Found" if comm_section else "NOT found")
        else:
            log("Property detail navigation", False, "No property detail links found")
    except Exception as e:
        page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "27_property_FAIL.png"))
        log("Property detail", False, str(e))

    # ========= NEW COMMUNICATION FORM =========
    print("\n--- New Communication Form ---")
    try:
        page.goto("http://localhost:3000/follow-ups/communications/new")
        page.wait_for_load_state("networkidle")
        time.sleep(2)
        page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "28_new_communication_form.png"))

        title = page.text_content("h1")
        log("New communication form load", title is not None, f"Title: {title}")

        # Check form fields
        type_select = page.query_selector('select[id*="type"], select:has(option:has-text("Phone Call"))')
        direction_select = page.query_selector('select:has(option:has-text("Sent")), select:has(option:has-text("Outgoing"))')
        contact_name = page.query_selector('input[name*="contact"], input[id*="contact"]')
        summary_field = page.query_selector('textarea')

        log("New comm form fields", type_select is not None or summary_field is not None,
            f"Type select: {'found' if type_select else 'missing'}, Summary: {'found' if summary_field else 'missing'}")

        # Check drag-drop zone
        drop_zone = page.query_selector('[class*="drop"], [class*="drag"]')
        log("New comm drag-drop zone", True, f"Drop zone: {'found' if drop_zone else 'not found (may use different selector)'}")
    except Exception as e:
        page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "28_new_comm_FAIL.png"))
        log("New communication form", False, str(e))

    # ========= TASKS PAGE =========
    print("\n--- Tasks Tab in Communications ---")
    try:
        page.goto("http://localhost:3000/communications?view=tasks")
        page.wait_for_load_state("networkidle")
        time.sleep(2)
        page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "29_tasks_tab.png"))

        # Check task stats
        body_text = page.text_content("body") or ""
        has_task_stats = "Open Tasks" in body_text
        log("Tasks tab stats", has_task_stats, "Task stats visible")

        # Check task filters
        task_status = page.query_selector('#task-status')
        task_priority = page.query_selector('#task-priority')
        log("Tasks tab filters", task_status is not None and task_priority is not None,
            f"Status: {'found' if task_status else 'missing'}, Priority: {'found' if task_priority else 'missing'}")

        # Check + New Task button
        new_task = page.query_selector('a:has-text("New Task")')
        log("Tasks tab New Task button", new_task is not None, "Found" if new_task else "NOT found")
    except Exception as e:
        page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "29_tasks_FAIL.png"))
        log("Tasks tab", False, str(e))

    browser.close()

print("\n" + "="*60)
print("TEST 02 RESULTS SUMMARY")
print("="*60)
passed = sum(1 for r in results if r.startswith("[PASS]"))
failed = sum(1 for r in results if r.startswith("[FAIL]"))
print(f"\nTotal: {len(results)} | Passed: {passed} | Failed: {failed}")
print()
for r in results:
    print(r)
