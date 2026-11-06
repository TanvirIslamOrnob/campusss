import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// VITE_BASE is "/campusss/" on GitHub Pages and "/" everywhere else.
export default defineConfig({ base: process.env.VITE_BASE || '/', plugins: [react()], server: { port: 5173, proxy: { '/api': 'http://localhost:8080', '/uploads': 'http://localhost:8080' } } });
