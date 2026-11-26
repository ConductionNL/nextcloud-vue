# Proposal: dashboard-layout-panel-locked

## Why

pipelinq's My work (requirement REQ-MW-160, board PqMijnWerkIndelen) lets the user hide and reorder its sections in the
layout panel, but the work list itself must never be hidden: a user who switches it off loses the page's purpose. The
layout panel (`layoutPanel`, 2.189.0) lets every section be hidden.

## What changes

- `config.layoutPanelLocked`: a list of widget ids the panel lists but does not let the user hide. They can still be
  moved. Their checkbox stays checked and disabled and reads "Always shown".
- Saving never stores a locked section as hidden, and a stored layout that hid one before it was locked draws it anyway.
- Manifest schema 2.201.0. A page without the key behaves as before.
