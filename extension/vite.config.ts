import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    envDir: '.', // Load .env files from current directory
    build: {
        outDir: '../dist-extension',
        emptyOutDir: true,
        rollupOptions: {
            input: {
                background: resolve(__dirname, 'background.js'),
                content: resolve(__dirname, 'content/trendyol-parser.js'),
                overlay: resolve(__dirname, 'content/overlay.js'),
                // Add other entry points if needed
            },
            output: {
                entryFileNames: '[name].js',
                chunkFileNames: '[name].js',
                assetFileNames: '[name].[ext]'
            }
        }
    },
    publicDir: 'public' // If you have assets like icons
});
