const WebSocket = require('ws');

const apiKey = "AIzaSyCOh8KwBP_AduDXayVXpf1L73Vzrf0pAq0";
const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`;

const ws = new WebSocket(url);

ws.on('open', () => {
  console.log('Connected');
  const setupMsg = {
    setup: {
      model: `models/gemini-2.5-flash-native-audio-preview-12-2025`,
      generationConfig: {
        responseModalities: ["AUDIO"]
      }
    }
  };
  ws.send(JSON.stringify(setupMsg));
});

ws.on('message', (data) => {
  console.log('Message:', data.toString());
  ws.close();
});

ws.on('error', (err) => {
  console.error('Error:', err);
});

ws.on('close', (code, reason) => {
  console.log('Closed:', code, reason.toString());
});
