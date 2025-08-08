/// <reference types="vitest" />
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    let allowedHosts: string[] = [];
    if (env.ALLOWED_HOSTS){
	allowedHosts = env.ALLOWED_HOSTS.split(',');
    }
    return {
      define: {
        'process.env.API_KEY': JSON.stringify(env.API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.API_KEY)
      },
      server: {
	host: true,
	allowedHosts: allowedHosts,
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      test: {
        globals: true,
        environment: 'jsdom',
      },
    };
});
