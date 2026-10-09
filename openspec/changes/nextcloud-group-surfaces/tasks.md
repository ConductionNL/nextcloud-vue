# Tasks: nextcloud-group-surfaces

### Task 1: Inline editor picks a group or a user
- **spec_ref**: `openspec/changes/nextcloud-group-surfaces/specs/data-display/spec.md#requirement-the-inline-editor-picks-a-nextcloud-group-or-user`
- **files**: `src/components/CnObjectDataWidget/CnObjectDataWidget.vue`, `tests/components/CnObjectDataWidgetGroupUser.spec.js`, `docs/components/cn-object-data-widget.md`
- [ ] Implement
- [ ] Test

### Task 2: A group cell shows the display name
- **spec_ref**: `openspec/changes/nextcloud-group-surfaces/specs/data-display/spec.md#requirement-a-group-cell-shows-the-groups-display-name`
- **files**: `src/utils/groupAutocomplete.js`, `src/components/CnCellRenderer/CnGroupNameCell.vue`, `src/components/CnCellRenderer/CnCellRenderer.vue`, `tests/components/CnCellRendererGroup.spec.js`, `tests/utils/groupAutocomplete.spec.js`, `docs/components/cn-cell-renderer.md`
- [ ] Implement
- [ ] Test

### Task 3: The `@myGroups` filter token
- **spec_ref**: `openspec/changes/nextcloud-group-surfaces/specs/schema-utilities/spec.md#requirement-myGroups-resolves-to-the-current-users-group-ids`
- **files**: `src/utils/widgetVisibility.js`, `src/utils/resolveFilterTokens.js`, `src/utils/sentinelTokens.js`, `src/schemas/app-manifest-v2.schema.json`, `tests/utils/resolveFilterTokensMyGroups.spec.js`, `tests/utils/sentinelTokens.spec.js`, `docs/utilities/sentinel-vocabulary.md`, `docs/components/cn-object-list-widget.md`
- [ ] Implement
- [ ] Test
