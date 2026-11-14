/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** The TechSphere API's address (see src/config.ts). */
  readonly VITE_API_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
