/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** The TechSphere API's address (see src/config.ts). */
  readonly VITE_API_BASE?: string;
  /** '1' in profiling builds (web/scripts/profile.mjs). */
  readonly VITE_PROFILE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
