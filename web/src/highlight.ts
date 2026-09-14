import { createCssVariablesTheme, createHighlighter, type BundledLanguage, type Highlighter, type SpecialLanguage } from "shiki";
import { sourceOfLine } from "./hunk.ts";
import { langFromPath } from "./lang.ts";

export type TokenSpan = { text: string; color?: string };

const LANGS: BundledLanguage[] = [
  "typescript",
  "tsx",
  "javascript",
  "jsx",
  "python",
  "go",
  "rust",
  "java",
  "json",
  "yaml",
  "markdown",
  "html",
  "css",
  "scss",
  "sql",
  "bash",
  "toml",
  "docker",
  "ruby",
  "c",
  "cpp",
  "csharp",
  "php",
  "swift",
  "kotlin",
  "graphql",
  "xml",
  "vue",
  "svelte",
  "proto",
  "hcl",
];

const LOADED = new Set<string>(LANGS);
const THEME = "nocturne";
const theme = createCssVariablesTheme({ name: THEME, variablePrefix: "--shiki-", fontStyle: true });

let highlighter: Highlighter | null = null;
let loading: Promise<void> | null = null;
const cache = new Map<string, TokenSpan[][]>();

export function ensureHighlighter(onReady: () => void): void {
  if (highlighter) {
    return;
  }
  loading ??= boot().then(onReady);
}

export function tokensForHunk(hunk: string, path: string): TokenSpan[][] | null {
  if (!highlighter) {
    return null;
  }
  const lang = langFor(path);
  const key = `${lang}\0${hunk}`;
  const hit = cache.get(key);
  if (hit) {
    return hit;
  }
  const source = hunk.split("\n").map(sourceOfLine).join("\n");
  const result = highlighter.codeToTokens(source, { lang, theme: THEME });
  const tokens = result.tokens.map((line) => line.map((tok) => ({ text: tok.content, color: tok.color })));
  cache.set(key, tokens);
  if (cache.size > 64) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) {
      cache.delete(oldest);
    }
  }
  return tokens;
}

function langFor(path: string): BundledLanguage | SpecialLanguage {
  const id = langFromPath(path);
  return LOADED.has(id) ? id as BundledLanguage : "text";
}

async function boot(): Promise<void> {
  try {
    highlighter = await createHighlighter({ langs: LANGS, themes: [theme] });
  } catch (error) {
    throw new Error("Failed to load syntax highlighter", { cause: error });
  }
}
