/// <reference types="vite/client" />

declare module "*.jsx" {
  import type { ComponentType } from "react";
  const component: ComponentType<Record<string, unknown>>;
  export default component;
}

declare module "*.js" {
  const value: unknown;
  export default value;
}
