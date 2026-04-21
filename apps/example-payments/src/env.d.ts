/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_N8N_WEBHOOK_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
