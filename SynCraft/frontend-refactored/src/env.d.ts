/// <reference types="vite/client" />

interface ImportMeta {
  readonly env: {
    readonly VITE_BACKEND: string;
    readonly [key: string]: string;
  };
}
