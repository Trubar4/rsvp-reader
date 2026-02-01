import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Für GitHub Pages: base auf Repository-Name setzen falls nicht im Root
  // Beispiel: base: '/rsvp-reader/' für https://username.github.io/rsvp-reader/
  // Für Root-Domain (z.B. Custom Domain): base: '/'
  base: './',
});
