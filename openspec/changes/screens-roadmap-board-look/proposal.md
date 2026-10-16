---
kind: code
---

# Proposal: screens-roadmap-board-look

## Summary

The drawn boards PqRoadmap (pipelinq) and DqFunctionaliteiten (dossiq) draw the Features and roadmap page in the board
look. Today the page lists the features alphabetically as plain cards with a right-hand sidebar, whatever the look.
In the board look it now draws CnFeaturesBoard: a title and subtitle, optional folder tabs (Features, Roadmap), a
status filter, the features grouped by category, an optional "Coming next" card with the most requested forge
issues, and an optional notice. The two boards differ in layout, filter and header, so those parts are configuration
(`config.board`), not two components.

## Scope

New internal component CnFeaturesBoard, two small utils (featureCatalog, roadmapIssues, the latter extracted from
CnRoadmapTab), new `categories`, `board`, `title` and `appVersion` props on the page and the view. The default look is
unchanged. No schema change: the `roadmap` page config is not constrained by the manifest schema.

Not covered (different page shapes, not configuration of this one): OrRoadmap (a voting table with an inline request
form), LrRoadmap (a vote-ranked list with saved views), SkFunctiesRoadmap (an extensions tab) and SkRoadmap (a
portfolio timeline).
