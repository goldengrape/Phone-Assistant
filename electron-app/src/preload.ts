/**
 * Preload script - exposes IPC to renderer
 */
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('phoneAPI', {
    // Call control
    startCall: (config?: { voice?: string; instruction?: string }) =>
        ipcRenderer.invoke('start-call', config),
    endCall: () =>
        ipcRenderer.invoke('end-call'),
    sendCommand: (command: string) =>
        ipcRenderer.invoke('send-command', command),

    // Status
    getStatus: () =>
        ipcRenderer.invoke('get-status'),
    listDevices: () =>
        ipcRenderer.invoke('list-devices'),

    // Events from main process
    onCallStatus: (callback: (status: string) => void) => {
        ipcRenderer.on('call-status', (_, status) => callback(status));
    },
    onAIStatus: (callback: (status: string) => void) => {
        ipcRenderer.on('ai-status', (_, status) => callback(status));
    },
    onError: (callback: (error: string) => void) => {
        ipcRenderer.on('error', (_, error) => callback(error));
    }
});
