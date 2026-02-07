// Test accessing Electron internals
console.log('=== Electron Internal Module Test ===');
console.log('process.versions.electron:', process.versions.electron);

// Check if we can access electron via built-in mechanism
// In Electron, there should be a way to get the real module
try {
    // This trick: temporarily remove the node_modules electron from resolution
    const Module = require('module');
    const originalResolve = Module._resolveFilename;

    Module._resolveFilename = function (request: string, parent: any, ...args: any[]) {
        if (request === 'electron') {
            // Return a special marker that Electron's loader will intercept
            return 'electron';
        }
        return originalResolve.call(this, request, parent, ...args);
    };

    const electron = require('electron');
    console.log('typeof electron after patch:', typeof electron);
    console.log('electron.app:', electron.app);
    console.log('electron.ipcMain:', electron.ipcMain);

    Module._resolveFilename = originalResolve;

    if (electron.app) {
        console.log('SUCCESS! Electron module loaded correctly!');
        electron.app.whenReady().then(() => {
            console.log('App ready!');
            electron.app.quit();
        });
    }
} catch (err: any) {
    console.log('Error:', err.message);
}
