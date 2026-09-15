import { defineConfig } from 'vite';
export default defineConfig({base:'./',build:{rollupOptions:{input:{home:'index.html',bunzai:'bunzai-burger.html',story:'our-story.html',menu:'bunzai-menu/menu.html'}}}});
