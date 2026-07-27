import type { ComponentType } from "react";

export type ToolCategory =
  | "encoding"
  | "crypto"
  | "ids"
  | "data"
  | "http"
  | "media"
  | "misc";

export interface ToolMeta {
  slug: string;
  name: string;
  description: string;
  category: ToolCategory;
  keywords: string[];
}

export type ToolComponent = ComponentType;

export const CATEGORY_LABELS: Record<ToolCategory, string> = {
  encoding: "Encoding",
  crypto: "Crypto & Keys",
  ids: "IDs & Time",
  data: "Data & Text",
  http: "HTTP & CLI",
  media: "Media",
  misc: "Units & Misc",
};
