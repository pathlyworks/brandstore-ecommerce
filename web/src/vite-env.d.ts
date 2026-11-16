/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** The TechSphere API's address (see src/config.ts). */
  readonly VITE_API_BASE?: string;
  /** The development default for VITE_API_BASE, defined by web/vite.config.ts (the API kit's local server). */
  readonly VITE_API_DEV_DEFAULT?: string;
  /** Optional: where error reports and Web Vitals are sent (navigator.sendBeacon). Unset: kept in the page only. */
  readonly VITE_MONITORING_ENDPOINT?: string;
  /** Optional: release name attached to error reports (CI sets it to the tag or commit). */
  readonly VITE_RELEASE?: string;
  /** '1' in profiling builds (web/scripts/profile.mjs). */
  readonly VITE_PROFILE?: string;
  /** '1' in the GitHub Pages build: the API is answered in the browser (src/demo/installDemoApi.ts). */
  readonly VITE_DEMO_API?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
