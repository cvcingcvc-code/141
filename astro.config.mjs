import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://cvcingcvc-code.github.io',
  base: '/141',
  outDir: 'dist',
  build: {
    assets: '_astro',
  },
});
