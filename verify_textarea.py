from playwright.sync_api import sync_playwright

def verify():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.on("console", lambda msg: print(f"Console {msg.type}: {msg.text}"))
        page.goto('http://localhost:5173')

        # Open Prompt if not open
        page.wait_for_selector('textarea')

        try:
            # Clear text and type
            textarea = page.locator('textarea')
            textarea.fill("New test text")
            print("Successfully filled textarea with 'New test text'")

            # Check value
            value = textarea.input_value()
            print(f"Textarea value is now: '{value}'")
        except Exception as e:
            print(f"Error filling textarea: {e}")

        browser.close()

if __name__ == '__main__':
    verify()
