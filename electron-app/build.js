const esbuild = require('esbuild');
const path = require('path');

// Build main process
esbuild.buildSync({
    entryPoints: ['src/main.ts'],
    bundle: true,
    platform: 'node',
    target: 'node18',
    outfile: 'dist/main.js',
    external: [
        'electron',  // Mark electron as external - Electron runtime provides this
        'naudiodon', // Native module - cannot be bundled
    ],
    sourcemap: true,
    format: 'cjs',
});

// Build preload script
esbuild.buildSync({
    entryPoints: ['src/preload.ts'],
    bundle: true,
    platform: 'node',
    target: 'node18',
    outfile: 'dist/preload.js',
    external: ['electron'],
    sourcemap: true,
    format: 'cjs',
});

console.log('Build completed successfully!');
