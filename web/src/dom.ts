export function requireEl(id: string): HTMLElement {
  const el = document.querySelector(id);
  if (!(el instanceof HTMLElement)) {
    throw new Error(`missing ${id}`);
  }
  return el;
}

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Record<string, string | boolean | undefined> = {},
  children: Array<Node | string> = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === false) {
      continue;
    }
    if (key === "class") {
      node.className = String(value);
      continue;
    }
    if (value === true) {
      node.setAttribute(key, "");
      continue;
    }
    node.setAttribute(key, value);
  }
  for (const child of children) {
    node.append(typeof child === "string" ? document.createTextNode(child) : child);
  }
  return node;
}

export function clear(node: HTMLElement): void {
  node.replaceChildren();
}
