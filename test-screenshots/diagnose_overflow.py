"""Diagnose exactly which elements cause horizontal overflow"""
from playwright.sync_api import sync_playwright
import time

def login(page):
    page.goto("http://localhost:3000/login")
    page.wait_for_load_state("networkidle")
    page.fill('input[type="email"]', "khen@betterlivingsolutions.com.au")
    page.fill('input[type="password"]', "Ay38uw!@")
    page.click('button[type="submit"]')
    page.wait_for_url("**/dashboard**", timeout=15000)
    page.wait_for_load_state("networkidle")

OVERFLOW_JS = """() => {
    const vw = document.documentElement.clientWidth;
    const overflowing = [];
    const all = document.querySelectorAll('*');
    for (const el of all) {
        const rect = el.getBoundingClientRect();
        if (rect.right > vw + 2 && rect.width > 0) {
            overflowing.push({
                tag: el.tagName,
                cls: (el.className?.toString() || '').slice(0, 100),
                right: Math.round(rect.right),
                width: Math.round(rect.width),
                text: (el.textContent || '').slice(0, 40).replace(/\\n/g, ' ').trim()
            });
        }
    }
    return { viewport: vw, scrollWidth: document.documentElement.scrollWidth, items: overflowing.slice(0, 20) };
}"""

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 375, "height": 667})
    page = context.new_page()

    login(page)

    for url, name in [
        ("http://localhost:3000/communications", "Communications"),
        ("http://localhost:3000/incidents", "Incidents"),
    ]:
        print(f"\n{'='*60}")
        print(f"Diagnosing: {name}")
        print(f"{'='*60}")
        page.goto(url)
        page.wait_for_load_state("networkidle")
        time.sleep(3)

        result = page.evaluate(OVERFLOW_JS)
        print(f"Viewport: {result['viewport']}px, ScrollWidth: {result['scrollWidth']}px")
        print(f"Overflowing elements: {len(result['items'])}")
        for i, item in enumerate(result['items']):
            print(f"  [{i}] <{item['tag']}> right={item['right']}px w={item['width']}px")
            print(f"       class=\"{item['cls']}\"")
            print(f"       text=\"{item['text']}\"")

    browser.close()
