let ignore = 0;

export function runWithoutReelSync(fn: () => void): void {
  ignore += 1;
  try {
    fn();
  } finally {
    ignore -= 1;
  }
}

export function reelScrollIgnored(): boolean {
  return ignore > 0;
}

export function revealFile(reel: HTMLElement, id: string | null): void {
  if (!id) {
    return;
  }
  const block = [...reel.querySelectorAll<HTMLElement>(".file-block")].find((el) => el.dataset.fileId === id);
  if (!block) {
    return;
  }
  runWithoutReelSync(() => {
    block.scrollIntoView({ block: "start" });
  });
}

export function fileAtViewport(reel: HTMLElement): string | null {
  const top = reel.getBoundingClientRect().top;
  let last: string | null = null;
  for (const block of reel.querySelectorAll<HTMLElement>(".file-block")) {
    const id = block.dataset.fileId;
    if (!id) {
      continue;
    }
    last = id;
    if (block.getBoundingClientRect().bottom > top + 1) {
      return id;
    }
  }
  return last;
}

export function paintCursorRows(reel: HTMLElement, id: string | null): void {
  for (const block of reel.querySelectorAll<HTMLElement>(".file-block")) {
    block.querySelector(".file-row")?.classList.toggle("cur", block.dataset.fileId === id);
  }
}
