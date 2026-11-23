# Proposal: board-column-colour-map

## Why

dossiq retires its own WorkflowBoard for the library board. dossiq's `statusType.colour` stores NL Design System hue
names (blue, orange, purple, green, grey and their `-light` tints). The library board draws a column dot through
`resolveStageColor`, which knows the badge variants only and passes any other value through as raw CSS. So "orange"
drew the browser's #ffa500 instead of the theme token, a `-light` value is not CSS and drew no dot, and no theme could
repoint the colour. dossiq's old board drew `var(--nl-color-<hue>, <hex>)`.

## What changes

- `columnFields[].source.colorMap`: a stored row colour to the CSS colour its column is drawn in.
- It applies to the column colour after the merge, so `neutralColor` still compares the stored values, and everything
  that draws the column colour gets the mapped value.
- Manifest schema 2.102.0.

A colour the map does not list, and a board without the key, draw as before.
