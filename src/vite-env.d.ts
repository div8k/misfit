/// <reference types="vite/client" />
interface ImportMetaEnv {
  /** Canonical public URL used in share links. Falls back to the current origin. */
  readonly PUBLIC_SITE_URL?: string;
}
