
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/rsvp-reader/' // set to '/<repo-name>/' if deploying under subpath
});
