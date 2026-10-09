import preact from '@preact/preset-vite';
import { defineConfig } from 'vite';
import { menuData } from './scripts/vite-plugin-menu-data.ts';

// На GitHub Pages сайт живёт в подпапке (/menu/). Workflow передаёт её через BASE_PATH.
const basePath = (process.env.BASE_PATH ?? '').replace(/\/+$/, '');

export default defineConfig({
  base: `${basePath}/`,
  plugins: [preact(), menuData()],
  build: {
    target: 'es2022',
  },
});
