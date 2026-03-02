import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/auth': 'http://localhost:3001',
      '/users': 'http://localhost:3001',
      '/channels': 'http://localhost:3001',
      '/messages': 'http://localhost:3001',
      '/conversations': 'http://localhost:3001',
      '/locations': 'http://localhost:3001',
      '/shifts': 'http://localhost:3001',
      '/feed': 'http://localhost:3001',
      '/praise': 'http://localhost:3001',
      '/dashboard': 'http://localhost:3001',
      '/payroll': 'http://localhost:3001',
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
      },
    },
  },
})
