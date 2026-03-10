import asyncio
from kivy.app import async_runTouchApp
from kivy.uix.boxlayout import BoxLayout
from kivy.uix.button import Button
from kivy.uix.textinput import TextInput
from kivy.uix.label import Label
from kivy.uix.spinner import Spinner
from kivy.clock import Clock

class PhoneAssistantGUI(BoxLayout):
    def __init__(self, text_in_q: asyncio.Queue, start_callback, stop_callback, **kwargs):
        super().__init__(orientation='vertical', padding=10, spacing=10, **kwargs)
        self.text_in_q = text_in_q
        
        self.start_callback = start_callback
        self.stop_callback = stop_callback

        # --- V2: Pre-call Configuration Area ---
        config_layout = BoxLayout(orientation='horizontal', size_hint_y=0.15, spacing=10)
        
        self.context_input = TextInput(
            hint_text='[Call Purpose] e.g. Introduce a new AI product',
            multiline=False,
            font_size='16sp'
        )
        config_layout.add_widget(self.context_input)
        
        self.lang_spinner = Spinner(
            text='Auto',
            values=('Auto', 'English', 'Chinese', 'Japanese'),
            size_hint_x=0.3
        )
        config_layout.add_widget(self.lang_spinner)
        self.add_widget(config_layout)

        # --- Main Status & Control Area ---
        status_layout = BoxLayout(orientation='horizontal', size_hint_y=0.15, spacing=10)
        self.status_label = Label(text="Status: Disconnected", font_size='20sp', size_hint_x=0.5)
        status_layout.add_widget(self.status_label)

        self.export_btn = Button(text="Export Log", font_size='16sp', size_hint_x=0.2, disabled=True)
        self.export_btn.bind(on_press=self.export_transcript)
        status_layout.add_widget(self.export_btn)

        self.connect_btn = Button(text="Connect", font_size='20sp', size_hint_x=0.3)
        self.connect_btn.bind(on_press=self.toggle_connection)
        status_layout.add_widget(self.connect_btn)
        self.add_widget(status_layout)

        # --- V2: Transcript Viewer Area ---
        self.transcript_view = TextInput(
            readonly=True,
            multiline=True,
            text='[Call Transcript Will Appear Here]\n',
            font_size='16sp',
            size_hint_y=0.5
        )
        self.add_widget(self.transcript_view)

        # --- Whisper Input Area ---
        self.whisper_input = TextInput(
            hint_text='[Supervisor Action] Type whisper here and press Enter...',
            multiline=False,
            font_size='18sp',
            size_hint_y=0.2
        )
        self.whisper_input.bind(on_text_validate=self.send_whisper)
        self.add_widget(self.whisper_input)
        
        self.is_connected = False

    def toggle_connection(self, instance):
        if not self.is_connected:
            self.status_label.text = "Status: Connecting..."
            self.connect_btn.text = "Disconnect"
            self.is_connected = True
            
            # Lock configs
            self.context_input.disabled = True
            self.lang_spinner.disabled = True
            self.export_btn.disabled = True
            self.transcript_view.text = "--- Call Started ---\n"
            
            # Fire an async task to the loop with config parameters
            context_val = self.context_input.text.strip()
            lang_val = self.lang_spinner.text
            asyncio.create_task(self.start_callback(self, context_val, lang_val))
        else:
            self.status_label.text = "Status: Disconnecting..."
            self.connect_btn.text = "Connect"
            self.is_connected = False
            
            # Unlock configs
            self.context_input.disabled = False
            self.lang_spinner.disabled = False
            self.export_btn.disabled = False
            
            asyncio.create_task(self.stop_callback(self))

    def send_whisper(self, instance):
        text = self.whisper_input.text.strip()
        if text:
            # Contract: queue text payload
            asyncio.create_task(self.text_in_q.put(text))
            self.whisper_input.text = ''
            self.status_label.text = f"Status: Whisper sent ({text[:10]}...)"
            self.append_transcript(f"[Supervisor]: {text}")
            
    def update_status(self, text):
        self.status_label.text = f"Status: {text}"
        
    def append_transcript(self, text):
        """Append text to the transcript view from any thread/coroutine."""
        self.transcript_view.text += f"{text}\n"

    def export_transcript(self, instance):
        import time
        import os
        filename = f"transcript_{int(time.time())}.txt"
        export_path = os.path.join(os.getcwd(), filename)
        with open(export_path, "w", encoding="utf-8") as f:
            f.write(self.transcript_view.text)
        self.update_status(f"Exported to {filename}")
