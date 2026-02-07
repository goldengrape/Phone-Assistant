/**
 * Electron Main Process
 */
import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { PhoneAssistant } from './phone-assistant';
import { printDevices, findVBCableDevices } from './list-devices';

// Load environment variables
dotenv.config();

let mainWindow: BrowserWindow | null = null;
let phoneAssistant: PhoneAssistant | null = null;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        backgroundColor: '#0f172a',
        titleBarStyle: 'hiddenInset',
        title: 'Phone Link Assistant'
    });

    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

    mainWindow.on('closed', () => {
        mainWindow = null;
        if (phoneAssistant) {
            phoneAssistant.endCall();
        }
    });
}

// IPC Handlers
ipcMain.handle('get-status', async () => {
    const vbCable = findVBCableDevices();
    return {
        apiKeySet: !!process.env.API_KEY,
        vbCableReady: vbCable.inputId !== null && vbCable.outputId !== null,
        vbCableDevices: vbCable,
        callActive: phoneAssistant?.callActive ?? false
    };
});

ipcMain.handle('list-devices', async () => {
    printDevices();
    return true;
});

ipcMain.handle('start-call', async (_, config?: { voice?: string; instruction?: string }) => {
    if (!process.env.API_KEY) {
        throw new Error('API_KEY not set. Please set it in .env file.');
    }

    if (phoneAssistant?.callActive) {
        return { success: false, error: 'Call already active' };
    }

    try {
        phoneAssistant = new PhoneAssistant({
            apiKey: process.env.API_KEY,
            voice: config?.voice || 'Zephyr',
            customInstruction: config?.instruction
        });

        phoneAssistant.on('call-started', () => {
            mainWindow?.webContents.send('call-status', 'started');
        });

        phoneAssistant.on('call-ended', () => {
            mainWindow?.webContents.send('call-status', 'ended');
        });

        phoneAssistant.on('ai-speaking', () => {
            mainWindow?.webContents.send('ai-status', 'speaking');
        });

        phoneAssistant.on('ai-silent', () => {
            mainWindow?.webContents.send('ai-status', 'silent');
        });

        phoneAssistant.on('error', (err) => {
            mainWindow?.webContents.send('error', err.message);
        });

        await phoneAssistant.startCall();
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('end-call', async () => {
    if (phoneAssistant) {
        phoneAssistant.endCall();
        phoneAssistant = null;
    }
    return { success: true };
});

ipcMain.handle('send-command', async (_, command: string) => {
    if (!phoneAssistant?.callActive) {
        return { success: false, error: 'No active call' };
    }
    phoneAssistant.sendCommand(command);
    return { success: true };
});

// App lifecycle
app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (phoneAssistant) {
        phoneAssistant.endCall();
    }
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
