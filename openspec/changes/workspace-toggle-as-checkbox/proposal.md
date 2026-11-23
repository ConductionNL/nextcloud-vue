# Proposal: workspace-toggle-as-checkbox

## Why

PqMijnWerk draws "Toon afgerond" in the lens bar as a checkbox; a workspace-filter toggle always drew a switch (pl3, visually differs 49%).

## What changes

A workspace-filter `style: "toggle"` takes `control: "checkbox"` to draw a checkbox. The switch stays the default; what it writes does not change. The manifest schema gains `control` (`switch`, `checkbox`).
