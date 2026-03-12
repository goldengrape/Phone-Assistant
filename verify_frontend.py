from playwright.sync_api import sync_playwright, expect

def verify():
    with sync_playwright() as p:
        # Provide browser permissions to simulate mic stream and avoid "Requested device not found"
        browser = p.chromium.launch(args=['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'])
        page = browser.new_page()
        page.on("console", lambda msg: print(f"Console {msg.type}: {msg.text}"))
        page.goto('http://localhost:5173')

        # Open Settings (in the new structure, it's the 2nd button in header)
        page.locator('header').locator('button').nth(0).click() # 0-indexed, it's the settings icon button

        page.wait_for_selector('input[type="password"]')
        page.locator('input[type="password"]').fill("INVALID_KEY_123")

        # Click Start Live Call
        page.get_by_role('button', name='Start Live Call').click()

        # Wait a bit to ensure the connection fails and displays the error state
        page.wait_for_timeout(3000)

        page.screenshot(path='/home/jules/verification/connection-error.png')
        print("Saved screenshot to /home/jules/verification/connection-error.png")

        browser.close()

if __name__ == '__main__':
    verify()
