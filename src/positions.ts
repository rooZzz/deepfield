import type { ClusterNode, Point, ServiceNode } from "./types.ts";

export function layoutPositions(services: ServiceNode[], clusters: ClusterNode[]): Record<string, Point> {
  const positions: Record<string, Point> = {};
  const n = Math.max(services.length, 1);
  const cols = n <= 2 ? n : 2;
  const rows = Math.ceil(n / cols);
  const inset = 0.24;
  services.forEach((service, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const jx = (unit(service.repo) - 0.5) * 0.016;
    const jy = (unit(`${service.repo}:y`) - 0.5) * 0.016;
    const x = cols === 1 ? 0.5 : inset + (col / Math.max(cols - 1, 1)) * (1 - 2 * inset);
    const y = rows === 1 ? 0.5 : inset + (row / Math.max(rows - 1, 1)) * (1 - 2 * inset);
    positions[service.id] = { x: x + jx, y: y + jy };
  });
  const byRepo = new Map<string, ClusterNode[]>();
  for (const cluster of clusters) {
    const list = byRepo.get(cluster.repo) ?? [];
    list.push(cluster);
    byRepo.set(cluster.repo, list);
  }
  for (const [repo, group] of byRepo) {
    const home = positions[`service:${repo}`] ?? { x: 0.5, y: 0.5 };
    group.forEach((cluster, index) => {
      const angle = (index / Math.max(group.length, 1)) * Math.PI * 2 + unit(repo) * 0.8;
      const radius = 0.052 + unit(`${cluster.id}:r`) * 0.028;
      positions[cluster.id] = {
        x: clamp(home.x + Math.cos(angle) * radius),
        y: clamp(home.y + Math.sin(angle) * radius),
      };
    });
  }
  return positions;
}

function unit(id: string): number {
  let hash = 2166136261;
  for (let i = 0; i < id.length; i++) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 100000) / 100000;
}

function clamp(value: number): number {
  return Math.min(0.9, Math.max(0.1, value));
}
