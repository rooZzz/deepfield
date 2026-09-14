const BY_EXT: Record<string, string> = {
  ts: "typescript",
  mts: "typescript",
  cts: "typescript",
  tsx: "tsx",
  js: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  jsx: "jsx",
  py: "python",
  go: "go",
  rs: "rust",
  java: "java",
  kt: "kotlin",
  json: "json",
  jsonc: "json",
  yml: "yaml",
  yaml: "yaml",
  md: "markdown",
  mdx: "markdown",
  html: "html",
  htm: "html",
  css: "css",
  scss: "scss",
  sql: "sql",
  sh: "bash",
  bash: "bash",
  zsh: "bash",
  toml: "toml",
  rb: "ruby",
  php: "php",
  swift: "swift",
  c: "c",
  h: "c",
  cpp: "cpp",
  cc: "cpp",
  cxx: "cpp",
  hpp: "cpp",
  cs: "csharp",
  vue: "vue",
  svelte: "svelte",
  xml: "xml",
  graphql: "graphql",
  gql: "graphql",
  proto: "proto",
  tf: "hcl",
};

const BY_NAME: Record<string, string> = {
  dockerfile: "docker",
  makefile: "text",
};

export function langFromPath(path: string): string {
  const base = path.split("/").pop()?.toLowerCase() ?? "";
  if (BY_NAME[base]) {
    return BY_NAME[base];
  }
  const dot = base.lastIndexOf(".");
  const ext = dot >= 0 ? base.slice(dot + 1) : "";
  return BY_EXT[ext] ?? "text";
}
