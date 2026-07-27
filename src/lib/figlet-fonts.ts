"use client";

import figlet from "figlet";

import Standard from "figlet/importable-fonts/Standard.js";
import Big from "figlet/importable-fonts/Big.js";
import Slant from "figlet/importable-fonts/Slant.js";
import Small from "figlet/importable-fonts/Small.js";
import Doom from "figlet/importable-fonts/Doom.js";
import Banner from "figlet/importable-fonts/Banner.js";
import Block from "figlet/importable-fonts/Block.js";
import Digital from "figlet/importable-fonts/Digital.js";
import Mini from "figlet/importable-fonts/Mini.js";
import Script from "figlet/importable-fonts/Script.js";
import Lean from "figlet/importable-fonts/Lean.js";
import Isometric1 from "figlet/importable-fonts/Isometric1.js";

export const FIGLET_FONTS = [
  "Standard",
  "Big",
  "Slant",
  "Small",
  "Doom",
  "Banner",
  "Block",
  "Digital",
  "Mini",
  "Script",
  "Lean",
  "Isometric1",
] as const;

export type FigletFontName = (typeof FIGLET_FONTS)[number];

const FONT_DATA: Record<FigletFontName, string> = {
  Standard,
  Big,
  Slant,
  Small,
  Doom,
  Banner,
  Block,
  Digital,
  Mini,
  Script,
  Lean,
  Isometric1,
};

const parsed = new Set<string>();

function ensureFont(name: FigletFontName) {
  if (parsed.has(name)) return;
  figlet.parseFont(name, FONT_DATA[name]);
  parsed.add(name);
}

export function renderFiglet(text: string, font: FigletFontName): string {
  const input = text.length ? text : " ";
  ensureFont(font);
  try {
    return figlet.textSync(input, { font });
  } catch (e) {
    return e instanceof Error ? `Error: ${e.message}` : "Render failed";
  }
}
