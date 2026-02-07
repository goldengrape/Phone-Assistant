// Minimal test - don't require anything first
console.log('=== Electron Environment Debug ===');
console.log('process.type:', process.type);
console.log('process.versions.electron:', process.versions.electron);

// Check Module resolution for 'electron'
try {
    const electronPath = require.resolve('electron');
    console.log('electron resolves to:', electronPath);
} catch (e) {
    console.log('Cannot resolve electron:', e.message);
}

// Try requiring electron and inspect what we get
const electronModule = require('electron');
console.log('typeof electron:', typeof electronModule);
console.log('electron value:', electronModule);

// If it's a string (file path), that's the problem
if (typeof electronModule === 'string') {
    console.log('ERROR: electron module returned a path string instead of the module!');
    console.log('This happens when node_modules/electron is resolved instead of Electron internal.');
}
