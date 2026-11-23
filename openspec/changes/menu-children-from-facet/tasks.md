# Tasks: menu-children-from-facet

### Task 1: A menu item can take its children from a facet
- **spec_ref**: `openspec/changes/menu-children-from-facet/specs/menu-widget/spec.md#requirement-a-menu-item-can-take-its-children-from-a-facet`
- **files**: `src/components/CnMenuWidget/CnMenuWidget.vue`
- [x] Implement: `childrenFrom`, `loadChildrenFrom`
- [x] Test: `tests/components/CnMenuWidgetChildrenFrom.spec.js`

### Task 2: A board tree draws its second level as sub-folders
- **spec_ref**: `openspec/changes/menu-children-from-facet/specs/menu-widget/spec.md#requirement-a-board-tree-draws-its-second-level-as-sub-folders`
- **files**: `src/css/look-board.css`, `src/components/CnMenuWidget/CnMenuWidget.vue`
- [x] Implement: `cn-menu-widget--expanded`, depth-2 row rule
- [x] Test: `tests/css/lookBoardMenuTreeRows.spec.js`
