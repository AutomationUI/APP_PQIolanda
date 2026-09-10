import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './playwright-test',
  webServer: {
    command: 'npx http-server -p 8080',
    url: 'http://127.0.0.1:8080',
    reuseExistingServer: true,
  },
  use: {
    baseURL: 'http://127.0.0.1:8080',
    headless: false,
    launchOptions: {
      slowMo: 800, // Pausa de 800ms entre ações para o usuário acompanhar visivelmente
    },
  },
});
