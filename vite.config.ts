import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import fs from 'fs'
import path from 'path'

const keyFile = path.resolve(__dirname, 'key.pem')
const certFile = path.resolve(__dirname, 'cert.pem')
const hasHttps = fs.existsSync(keyFile) && fs.existsSync(certFile)

// Proxy '/api' requests to FastAPI backend (defaults to 127.0.0.1:8000)
export default defineConfig({
  plugins: [react()],
  server: {
    https: hasHttps ? {
      key: fs.readFileSync(keyFile),
      cert: fs.readFileSync(certFile),
    } : false,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})
