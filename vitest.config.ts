import { defineConfig } from 'vitest/config'

// Configuración aparte de vite.config.ts para no cargar el plugin PWA en las pruebas.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
