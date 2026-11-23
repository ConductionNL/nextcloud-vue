# pl4-roadmap-flow

## Why

Two apps (pipelinq and dossiq) keep a custom roadmap page only to put one link above the library page: how the app
compares, on its public site. Two apps (pipelinq and procest) keep a one-line component only to mount CnFlowSidebar on
their flow page. Both are library defaults that were missing.

## What changes

- CnFeaturesAndRoadmapPage takes `compareUrl` (a URL, or a map from language to URL) and `compareLabel`, and links to
  the comparison above the page, in a new tab, with the host named.
- A `flow` (and `flow-detail`) page that names no `sidebarComponent` mounts CnFlowSidebar.

## Fleet reuse

- pipelinq `FeaturesRoadmapView` and dossiq's wrapper go back to `type: "roadmap"`.
- pipelinq and procest `FlowDetailSidebar.vue` are deleted.
