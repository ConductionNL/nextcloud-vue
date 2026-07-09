# Tasks — detail-page object files + related resolution

## 1. Object-bound files widget (feature H)
- [ ] 1.1 Add an object-folder mode (prop `objectData`/`register`/`schema`/`objectId`) to the detail files widget, or a dedicated `CnObjectFilesWidget`, that lists/uploads/deletes via `/apps/openregister/api/objects/{register}/{schema}/{id}/files`.
- [ ] 1.2 Drag-drop + Upload attaches files to the object (POST JSON `{name, content}`); delete via the object-files DELETE endpoint.
- [ ] 1.3 `CnDetailPage` maps a `type: files` widget on a detail page to the object-bound mode (deriving context from the loaded object); dashboards keep `CnFilesWidget`.
- [ ] 1.4 Component test: upload→list→delete against a mocked object-files endpoint; docs page updated (check:docs).

## 2. Related widget resolution
- [ ] 2.1 Confirm `CnRelatedObjectsWidget` resolves register/schema/id from `objectData['@self']` on the runtime detail and fetches `/uses`, `/used`, `/relations`.
- [ ] 2.2 Render every non-empty group (objects = uses∪used, files, leaf groups); keep hidden-when-empty only for empty groups.
- [ ] 2.3 Regression test: fixture object with reverse relations (e.g. a pet referenced by visits) renders an "objects" group with ≥1 item.
- [ ] 2.4 Rebuild the styleguide partial if props/slots change (prebuild:docs); jsdoc baseline unchanged or bumped.

## 3. Verification
- [ ] 3.1 Live (OpenBuild Pet Store): the pet detail Files widget uploads a photo to the pet object and lists it; the Related widget shows the pet's visits/orders.
- [ ] 3.2 `npm test` + `npm run check:docs` + `npm run check:jsdoc` green.
