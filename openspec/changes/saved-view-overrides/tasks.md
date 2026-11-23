# Tasks: saved-view-overrides

- [x] 1.1 The allowlist, the config merge, the slot overlay and the badge count
  - Files: src/utils/savedViewOverrides.js, src/utils/savedViewHelpers.js
  - Test: tests/utils/savedViewOverrides.spec.js
- [x] 1.2 CnIndexPage reports the applied view's overrides, selects its sort option and stores its menu badge
  - Files: src/components/CnIndexPage/CnIndexPage.vue, src/components/CnIndexPage/useSelfFetchList.js
  - Test: tests/components/CnSavedViewOverrides.spec.js
- [x] 1.3 CnPageRenderer lays the overrides over the page config and slots
  - Files: src/components/CnPageRenderer/CnPageRenderer.vue
  - Test: tests/components/CnSavedViewOverrides.spec.js
- [x] 1.4 The "My views" menu entry shows the view's count
  - Files: src/utils/savedViewMenu.js, src/components/CnAppRoot/CnAppRoot.vue
  - Test: tests/utils/savedViewOverrides.spec.js
- [x] 1.5 Manifest schema 2.132.0 declares overrides and the crumb query
  - Files: src/schemas/app-manifest-v2.schema.json, src/components/CnPageHeader/CnHeaderTrail.vue, src/components/CnDetailPage/CnDetailPage.vue, tests/schemas/app-manifest-v2.schema.hashes.json
  - Test: tests/components/CnSavedViewOverrides.spec.js
- [x] 1.6 lockedFilters, the profile patch by slug, and the card description, chips and overdue tone
  - Files: src/utils/savedViewOverrides.js, src/components/CnObjectCard/CnObjectCard.vue, src/css/look-board-index.css, src/schemas/app-manifest-v2.schema.json
  - Test: tests/utils/savedViewOverrides.spec.js, tests/components/CnObjectCardRecordParts.spec.js
