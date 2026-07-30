import type { ComponentType } from "react";

export type ToolCategory =
  | "cloud"
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
  /** Short help shown in the tool header (i) popover. */
  info: string;
  /** Requires Go API + Google login. */
  cloud?: boolean;
}

export type ToolComponent = ComponentType;

export const CATEGORY_LABELS: Record<ToolCategory, string> = {
  cloud: "Cloud (login)",
  encoding: "Encoding",
  crypto: "Crypto & Keys",
  ids: "IDs & Time",
  data: "Data & Text",
  http: "HTTP & CLI",
  media: "Media",
  misc: "Units & Misc",
};
