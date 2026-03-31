/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_API_PATH: string
  readonly VITE_CLOUD_ENV_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
