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
      "z-index": 0,
      label: "data(label)",
    },
  },
  {
    selector: 'node[kind = "cluster"]',
    style: {
      shape: "ellipse",
      "background-fill": "radial-gradient",
      "background-gradient-stop-colors": "#f0f2fa #7a8198",
      "background-gradient-stop-positions": "0% 70%",
      width: "data(size)",
      height: "data(size)",
      "border-width": 0,
      "text-opacity": 0,
      "underlay-opacity": 0.16,
      "underlay-color": "#c5c9d8",
      "underlay-padding": 7,
      "underlay-shape": "ellipse",
      "z-index": 8,
      label: "data(label)",
    },
  },
  {
    selector: "node.hollow",
    style: {
      "background-fill": "solid",
      "background-color": "#171a27",
      "background-opacity": 1,
      "border-width": 1,
      "border-color": "#595d6c",
      "underlay-opacity": 0,
    },
  },
  {
    selector: "node.risk-high",
    style: {
      "background-gradient-stop-colors": "#e0c4b8 #8d7b74",
      "underlay-opacity": 0.32,
      "underlay-color": "#c58a72",
      "underlay-padding": 7,
      "underlay-shape": "ellipse",
    },
  },
  {
    selector: "node.risk-med",
    style: {
      "underlay-opacity": 0.22,
      "underlay-color": "#b9a06a",
      "underlay-padding": 5,
      "underlay-shape": "ellipse",
    },
  },
  {
    selector: 'node[kind = "cluster"]:selected',
    style: {
      "background-fill": "solid",
      "background-color": "#d2cefd",
      "border-width": 1.6,
      "border-color": "#9184d9",
      "underlay-opacity": 0.28,
      "underlay-color": "#9184d9",
      "underlay-padding": 8,
      "underlay-shape": "ellipse",
    },
  },
  {
    selector: 'node[kind = "file"]',
    style: {
      shape: "ellipse",
      width: 7,
      height: 7,
      "background-color": "#9397ab",
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
      "border-width": 1,
      "border-color": "#cf8f83",
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
    selector: 'edge[kind = "path"]',
    style: {
      "curve-style": "unbundled-bezier",
      "control-point-distances": 28,
      "line-color": "#9184d9",
      width: 2,
      opacity: 0.88,
      "z-index": 4,
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
