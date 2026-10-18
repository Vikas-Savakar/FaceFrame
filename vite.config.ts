import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({ plugins: [react(), {
  name: 'production-privacy-policy', apply: 'build',
  transformIndexHtml() { return [{ tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; connect-src 'self'; img-src 'self' blob: data:; media-src 'self' blob:; style-src 'self' 'unsafe-inline'; worker-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'" }, injectTo: 'head-prepend' }]; },
}] });
