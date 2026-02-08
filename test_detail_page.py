"""Test complaint detail page with compliance sidebar"""
from playwright.sync_api import sync_playwright
import time

SCREENSHOTS_DIR = "c:/Projects/sda-management/test_screenshots"

def main():
    import os
    os.makedirs(SCREENSHOTS_DIR, exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1920, "height": 1080})
        page = context.new_page()

        # Inject auth via localStorage with real user ID
        page.goto("http://localhost:3000/login")
        page.wait_for_load_state("networkidle")
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

        # Go to complaints list
        page.goto("http://localhost:3000/compliance/complaints")
        page.wait_for_load_state("networkidle")
        time.sleep(4)

        print("=== Complaints List Page ===")
        print(f"  URL: {page.url}")

        # Find and click "View" link
        view_links = page.locator("a:has-text('View'), button:has-text('View')")
        view_count = view_links.count()
        print(f"  View links found: {view_count}")

        if view_count > 0:
            # Click the first View link
            first_link = view_links.first
            href = first_link.get_attribute("href")
            print(f"  First View link href: {href}")
            first_link.click()
            time.sleep(3)
            page.wait_for_load_state("networkidle")
            time.sleep(3)

            print(f"\n=== Complaint Detail Page ===")
            print(f"  URL: {page.url}")

            # Take full screenshots
            page.screenshot(path=f"{SCREENSHOTS_DIR}/10_detail_top.png", full_page=False)

            # Scroll to middle
            page.evaluate("window.scrollTo(0, 600)")
            time.sleep(1)
            page.screenshot(path=f"{SCREENSHOTS_DIR}/10b_detail_middle.png", full_page=False)

            # Scroll to bottom
            page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            time.sleep(1)
            page.screenshot(path=f"{SCREENSHOTS_DIR}/10c_detail_bottom.png", full_page=False)

            # Full page screenshot
            page.screenshot(path=f"{SCREENSHOTS_DIR}/10d_detail_full.png", full_page=True)

            # Check page content
            page_text = page.inner_text("body")

            checks = {
                "Reference number (CMP-)": "CMP-" in page_text,
                "24hr countdown/ack": any(w in page_text.lower() for w in ["remaining", "overdue", "acknowledged", "hours", "acknowledge"]),
                "Progress stages": any(w in page_text for w in ["Acknowledge", "Triage", "Investigate", "Resolve"]),
                "Compliance sidebar": any(w in page_text.lower() for w in ["procedure", "guidance", "stage guidance"]),
                "Chain of custody": any(w in page_text.lower() for w in ["chain of custody", "audit trail", "custody"]),
                "Locked record": any(w in page_text.lower() for w in ["locked", "website"]),
                "Source": any(w in page_text.lower() for w in ["website", "source"]),
                "Action buttons": any(w in page_text for w in ["Acknowledge", "Assign", "Resolve", "Escalate"]),
                "Complainant": any(w in page_text.lower() for w in ["test user", "jane smith"]),
                "Category": any(w in page_text.lower() for w in ["service delivery", "property condition"]),
                "Severity badge": any(w in page_text for w in ["Medium", "High", "Low", "Critical"]),
                "Quick stats": any(w in page_text.lower() for w in ["days open", "preferred contact"]),
            }

            for check_name, passed in checks.items():
                status = "PASS" if passed else "INFO"
                print(f"  {status}: {check_name}")

        else:
            print("  ERROR: No View links found")

            # Try alternative - look for href links
            all_links = page.evaluate("""() => {
                return Array.from(document.querySelectorAll('a')).map(a => ({
                    href: a.href, text: a.textContent?.trim()?.substring(0, 60)
                })).filter(l => l.href.includes('complaints'))
            }""")
            print(f"  All complaint links: {len(all_links)}")
            for l in all_links:
                print(f"    - {l['href']} ({l['text']})")

        browser.close()
        print("\nDone!")

if __name__ == "__main__":
    main()
