# Proposal: flow-canvas-fit-below-chrome

## Why

Board PqFlow draws the first steps below the floating canvas toolbar. Live (pl6) framed the graph over the whole
canvas, so the toolbar and its validity pill lay over the top steps and took a click meant for "E-mail sturen aan de
inwoner". The canvas section also had no definite height on the canvas layout (its body is a block with a min-height),
so the graph canvas inside collapsed to its own minimum and Vue Flow measured a pane without height; PqFlow and
PqFlowRun showed no steps at all.

## What changes

1. CnGraphCanvas takes `fitInset`: pixels per side (`{ top, right, bottom, left }`) covered by chrome floating over the
   canvas, or a function that returns them when the canvas fits. The first frame and the fit control keep the graph
   clear of them (Vue Flow's per-side pixel padding: inset plus 24px). Without it nothing changes.
2. CnFlowDetail passes `fitInset` through.
3. CnFlowBoard, on `layout: "canvas"`, passes a function that measures the canvas toolbar, the run card and the side
   panel against the canvas (util `overlayInset`), and lets the canvas fill the body (`position: absolute; inset: 0`).
