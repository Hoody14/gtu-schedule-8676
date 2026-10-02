/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GITHUB_REPO?: string
  readonly VITE_GITHUB_REF?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/** Identifier of the bundle currently running, injected at build time. */
declare const __BUILD_ID__: string
