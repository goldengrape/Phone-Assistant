// Renderer process script
const api = window.phoneAPI;

// DOM Elements
const statusBadge = document.getElementById('status-badge');
const statusText = statusBadge.querySelector('.status-text');
const apiStatus = document.getElementById('api-status').querySelector('.value');
const vbcableStatus = document.getElementById('vbcable-status').querySelector('.value');
const btnStart = document.getElementById('btn-start');
const btnStop = document.getElementById('btn-stop');
const commandInput = document.getElementById('command-input');
const btnSend = document.getElementById('btn-send');
const aiAvatar = document.getElementById('ai-avatar');
const visualizerText = document.getElementById('visualizer-text');
const errorToast = document.getElementById('error-toast');

// State
let isCallActive = false;

// Initialize
async function init() {
    await updateStatus();
    setupEventListeners();
    setupIPCListeners();
}

// Update system status
async function updateStatus() {
    try {
        const status = await api.getStatus();

        // API Key status
        if (status.apiKeySet) {
            apiStatus.textContent = 'Configured ✓';
            apiStatus.classList.add('success');
            apiStatus.classList.remove('error');
        } else {
            apiStatus.textContent = 'Not Set ✗';
            apiStatus.classList.add('error');
            apiStatus.classList.remove('success');
        }

        // VB-Cable status
        if (status.vbCableReady) {
            vbcableStatus.textContent = 'Ready ✓';
            vbcableStatus.classList.add('success');
            vbcableStatus.classList.remove('error');
        } else {
            vbcableStatus.textContent = 'Not Found ✗';
            vbcableStatus.classList.add('error');
            vbcableStatus.classList.remove('success');
        }

        // Overall status badge
        if (status.apiKeySet && status.vbCableReady) {
            statusBadge.className = 'status-badge ready';
            statusText.textContent = 'Ready';
            btnStart.disabled = false;
        } else {
            statusBadge.className = 'status-badge error';
            statusText.textContent = 'Not Ready';
            btnStart.disabled = true;
        }

        // Update call state
        isCallActive = status.callActive;
        updateCallUI();

    } catch (error) {
        console.error('Failed to get status:', error);
        showError('Failed to get system status');
    }
}

// Update UI based on call state
function updateCallUI() {
    if (isCallActive) {
        btnStart.classList.add('hidden');
        btnStop.classList.remove('hidden');
        commandInput.disabled = false;
        btnSend.disabled = false;
        statusBadge.className = 'status-badge active';
        statusText.textContent = 'Active Call';
        visualizerText.textContent = 'AI is listening...';
    } else {
        btnStart.classList.remove('hidden');
        btnStop.classList.add('hidden');
        commandInput.disabled = true;
        btnSend.disabled = true;
        aiAvatar.classList.remove('speaking');
        visualizerText.textContent = 'Ready to connect';
        updateStatus(); // Re-check ready state
    }
}

// Event Listeners
function setupEventListeners() {
    btnStart.addEventListener('click', async () => {
        btnStart.disabled = true;
        btnStart.textContent = 'Connecting...';

        const result = await api.startCall();

        if (!result.success) {
            showError(result.error || 'Failed to start call');
            btnStart.disabled = false;
            btnStart.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="5 3 19 12 5 21 5 3"/>
        </svg>
        Start AI Agent
      `;
        }
    });

    btnStop.addEventListener('click', async () => {
        await api.endCall();
    });

    btnSend.addEventListener('click', sendCommand);

    commandInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !btnSend.disabled) {
            sendCommand();
        }
    });

    errorToast.querySelector('.toast-close').addEventListener('click', () => {
        errorToast.classList.add('hidden');
    });
}

// Send command to AI
async function sendCommand() {
    const command = commandInput.value.trim();
    if (!command) return;

    commandInput.value = '';
    await api.sendCommand(command);
}

// IPC Listeners from main process
function setupIPCListeners() {
    api.onCallStatus((status) => {
        isCallActive = status === 'started';
        updateCallUI();
    });

    api.onAIStatus((status) => {
        if (status === 'speaking') {
            aiAvatar.classList.add('speaking');
            visualizerText.textContent = 'AI is speaking...';
        } else {
            aiAvatar.classList.remove('speaking');
            visualizerText.textContent = 'AI is listening...';
        }
    });

    api.onError((error) => {
        showError(error);
    });
}

// Show error toast
function showError(message) {
    errorToast.querySelector('.toast-message').textContent = message;
    errorToast.classList.remove('hidden');

    setTimeout(() => {
        errorToast.classList.add('hidden');
    }, 5000);
}

// Start app
init();
