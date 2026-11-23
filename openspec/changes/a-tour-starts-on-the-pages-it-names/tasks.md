# Tasks: a-tour-starts-on-the-pages-it-names

- [x] 1.1 Schema: `startOn` on a tour, version 2.94.0, hash recorded
  - Files: src/schemas/app-manifest-v2.schema.json, tests/schemas/app-manifest-v2.schema.hashes.json, tests/schemas/app-manifest-v2.schema.spec.js
  - Test: tests/utils/validateManifest.walkthrough.spec.js
- [x] 1.2 `CnWalkthrough.routeMatchesTour()` honours `startOn` before the centered-step rule
  - Files: src/components/CnWalkthrough/CnWalkthrough.vue
  - Test: tests/components/CnWalkthroughSkipAndRoute.spec.js (deep link waits then opens, a named route opens at once, a control without `startOn`, a tour started by hand)
- [x] 1.3 Docs and changelog
  - Files: docs/components/cn-walkthrough.md, CHANGELOG.md
