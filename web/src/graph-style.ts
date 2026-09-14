import type { StylesheetJson } from "cytoscape";

export const graphStyle: StylesheetJson = [
  {
    selector: "node",
    style: {
      "font-family": "Inter, system-ui, sans-serif",
      "font-size": 11,
      color: "#b2b6ca",
      "overlay-opacity": 0,
      "text-events": "no",
      "z-index-compare": "manual",
    },
  },
  {
    selector: 'node[kind = "service"]',
    style: {
      shape: "ellipse",
      width: "data(size)",
      height: "data(size)",
      "background-opacity": 0,
      "border-width": 0,
      "text-opacity": 0,
      events: "no",
      "z-index": 0,
      label: "data(label)",
    },
  },
  {
    selector: 'node[kind = "cluster"]',
    style: {
      shape: "ellipse",
      width: "data(size)",
      height: "data(size)",
      "background-opacity": 0,
      "border-width": 0,
      "text-opacity": 0,
      "underlay-opacity": 0,
      "z-index": 8,
      label: "data(label)",
    },
  },
  {
    selector: 'node[kind = "cluster"]:selected',
    style: {
      "underlay-opacity": 0.3,
      "underlay-color": "#9184d9",
      "underlay-padding": 10,
      "underlay-shape": "ellipse",
    },
  },
  {
    selector: 'node[kind = "file"]',
    style: {
      shape: "ellipse",
      width: "data(size)",
      height: "data(size)",
      "background-color": "data(fill)",
      "font-size": 9,
      "font-family": "IBM Plex Mono, ui-monospace, monospace",
      "text-opacity": 0,
      display: "none",
      "z-index": 10,
      label: "data(label)",
    },
  },
  {
    selector: "node.file-del",
    style: {
      "background-opacity": 0,
      "border-width": 1.2,
      "border-color": "data(fill)",
    },
  },
  {
    selector: "edge",
    style: {
      width: 0.9,
      "line-color": "#3f424d",
      "curve-style": "unbundled-bezier",
      "control-point-distances": 32,
      "control-point-weights": 0.5,
      "target-arrow-shape": "none",
      opacity: 0.55,
      "z-index-compare": "manual",
      "z-index": 1,
    },
  },
  {
    selector: "edge[cross = 1]",
    style: {
      "line-color": "#7972a9",
      width: 1.35,
      "control-point-distances": 64,
      opacity: 0.75,
      "z-index": 2,
    },
  },
  {
    selector: 'edge[kind = "echo"]',
    style: {
      "line-style": "dotted",
      "line-color": "#7972a9",
      width: 1.35,
      opacity: 0.8,
      "control-point-distances": 68,
    },
  },
  {
    selector: 'edge[kind = "contract"]',
    style: {
      "line-style": "dashed",
      "line-color": "#9184d9",
      width: 1.4,
      opacity: 0.85,
      "control-point-distances": 72,
    },
  },
  {
    selector: "edge.on-path",
    style: {
      opacity: 1,
      width: 2.15,
      "line-color": "#9184d9",
      "z-index": 5,
    },
  },
  {
    selector: ".recede",
    style: {
      opacity: 0.18,
    },
  },
  {
    selector: "edge:selected",
    style: {
      opacity: 1,
      width: 2.4,
      "line-color": "#d2cefd",
      "z-index": 6,
    },
  },
];
