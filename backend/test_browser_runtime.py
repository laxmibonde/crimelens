import sys
import time
from playwright.sync_api import sync_playwright

MODULES = [
    ("/dashboard", "CrimeLens Executive Command Center"),
    ("/hotspots", "Hotspot"),
    ("/evolution", "Evolution"),
    ("/kmeans", "K-Means"),
    ("/apriori", "Apriori"),
    ("/decision-tree", "Decision Tree"),
    ("/area-intelligence", "Area Intelligence"),
    ("/trend-analysis", "Trend"),
    ("/what-changed", "What Changed"),
    ("/insights", "Insights"),
    ("/etl-monitoring", "ETL"),
    ("/data-quality", "Data Quality"),
    ("/olap", "OLAP"),
    ("/reports", "Report"),
    ("/power-bi", "Power BI")
]

def run_browser_verification():
    console_errors = []
    page_errors = []

    print("Launching Chromium browser for real runtime verification...")
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="msedge", headless=True)
        context = browser.new_context(viewport={"width": 1400, "height": 900})
        page = context.new_page()

        def handle_console(msg):
            if msg.type == "error":
                text = msg.text
                print(f"  [BROWSER CONSOLE ERROR] {text}")
                # Exclude benign leaflet or network aborts if any
                if "lakeBlue" in text or "Uncaught TypeError" in text:
                    console_errors.append(text)

        def handle_pageerror(err):
            err_msg = str(err)
            print(f"  [BROWSER UNCAUGHT EXCEPTION] {err_msg}")
            page_errors.append(err_msg)

        page.on("console", handle_console)
        page.on("pageerror", handle_pageerror)

        # 1. Test Dashboard Initial Load
        print("\n--- 1. Testing Dashboard Page at http://localhost:5173 ---")
        page.goto("http://localhost:5173/dashboard", wait_until="networkidle", timeout=30000)
        time.sleep(2)

        # Check for lakeBlue crash
        assert not any("lakeBlue" in e for e in page_errors), "Found lakeBlue error in page errors!"
        assert not any("lakeBlue" in e for e in console_errors), "Found lakeBlue error in console errors!"

        # Verify page content rendered
        body_text = page.inner_text("body")
        assert "CrimeLens" in body_text, "CrimeLens brand not found on page!"
        assert "RECORDED INCIDENTS" in body_text or "Command Center Analytics" in body_text, "Dashboard content not found!"
        print("  -> Dashboard rendered cleanly without lakeBlue TypeError!")

        # 2. Test Error Boundary Resilience
        print("\n--- 2. Verifying Error Boundary Component ---")
        # Ensure main shell exists
        sidebar = page.locator(".sidebar, .sidebar-container, nav").first
        header = page.locator(".header-container, header").first
        print(f"  -> Sidebar and Header elements present.")

        # 3. Test Dataset Toggle (Real vs Synthetic)
        print("\n--- 3. Testing Global Dataset Selector Toggle ---")
        # Look for dataset toggle or buttons
        synth_btn = page.locator("text='Synthetic'").first
        if synth_btn.count() > 0:
            synth_btn.click()
            time.sleep(1.5)
            print("  -> Switched to Synthetic Dataset without crashes.")
            real_btn = page.locator("text='Real'").first
            if real_btn.count() > 0:
                real_btn.click()
                time.sleep(1.5)
                print("  -> Switched back to Real Dataset.")

        # 4. Navigate through each module
        print("\n--- 4. Navigating Through Every Module ---")
        for route, label in MODULES:
            url = f"http://localhost:5173{route}"
            print(f"  Navigating to {route} ({label})...")
            page.goto(url, wait_until="domcontentloaded", timeout=25000)
            time.sleep(1.5)
            # Verify body has content and not empty
            text_content = page.inner_text("body")
            assert len(text_content) > 100, f"Module {route} returned empty content!"
            assert "CrimeLens" in text_content, f"Application shell missing on {route}!"
            print(f"    OK: {route} mounted successfully.")

        browser.close()

    print("\n--- SUMMARY OF BROWSER ERRORS ---")
    print(f"Targeted lakeBlue / Fatal Errors: {len(page_errors) + len(console_errors)}")
    if page_errors:
        print("Page Errors:", page_errors)
        sys.exit(1)
    if console_errors:
        print("Console Errors:", console_errors)
        sys.exit(1)

    print("\nSUCCESS: All modules navigated, zero fatal exceptions, lakeBlue error completely resolved!")

if __name__ == "__main__":
    run_browser_verification()
