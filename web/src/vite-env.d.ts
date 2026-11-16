/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** The TechSphere API's address (see src/config.ts). */
  readonly VITE_API_BASE?: string;
  /** '1' in profiling builds (web/scripts/profile.mjs). */
  readonly VITE_PROFILE?: string;
  /** '1' in the GitHub Pages build: the API is answered in the browser (src/demo/installDemoApi.ts). */
  readonly VITE_DEMO_API?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
