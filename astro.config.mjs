import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://cvcingcvc-code.github.io',
  base: '/personal-knowledge-os',
  outDir: 'dist',
  build: {
    assets: '_astro',
  },
});
