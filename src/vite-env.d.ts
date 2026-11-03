/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

/** The version from package.json, set in vite.config.ts. */
declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  /** Set to "true" to allow the local sign-in stub in a production build (preview deploys only). */
  readonly VITE_AUTH_STUB?: string;
}
