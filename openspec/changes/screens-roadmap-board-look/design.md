# Design: screens-roadmap-board-look

- One component, configured: `layout` (`cards` for PqRoadmap, `rows` for DqFunctionaliteiten), `tabs`, `filter`
  (`chips` with counts, `segmented` without), `statusLabels` (Dossiq says "Stabiel" where Pipelinq says
  "Beschikbaar"), `next` (the Coming next card, 0 hides it), `issueLabels`, `subtitle` (`{count}`, `{appVersion}`),
  `notice`, `documentationButton`, `suggestButton`.
- Statuses: available, beta, in progress, planned. Pipelinq's `stable` and the spec status `done` read as available;
  a feature without a status is available, as every entry was before. The in-progress chip only shows when a feature
  has that status.
- Titles and summaries read `title_<lang>` / `summary_<lang>` first, so the curated features.json reads Dutch for a
  Dutch reader.
- The board has no right-hand column: the suggest, buildiq, AI skills and support links sit in an Actions menu.
- The forge fetch moves from CnRoadmapTab into `utils/roadmapIssues.js`, so the Roadmap tab and the Coming next card
  share it.
