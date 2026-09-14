export type ToolsPreviewOption = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  href: string;
};

export const TOOLS_PREVIEW_OPTIONS: ToolsPreviewOption[] = [
  {
    id: "terminal-lab",
    name: "Terminal Lab",
    tagline: "Boot → typewriter → spotlight cards",
    description:
      "Chosen direction — emerald terminal aesthetic, live search + category chips, spotlight cards. No bootloader.",
    href: "/preview/terminal-lab",
  },
  {
    id: "workshop-light",
    name: "Workshop Light",
    tagline: "Paper unfold + magnetic tilt",
    description:
      "Curtain reveal, spring headline, 3D magnetic cards on hover. Quiet workbench energy with real motion.",
    href: "/preview/workshop-light",
  },
  {
    id: "signal-board",
    name: "Signal Board",
    tagline: "Radar sweep + telemetry cascade",
    description:
      "Sync spinner, radar sweep, cascading channel cards, pulse status — ops-console choreography.",
    href: "/preview/signal-board",
  },
];
