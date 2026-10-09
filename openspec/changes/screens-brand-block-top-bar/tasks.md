# Tasks: screens-brand-block-top-bar

> ADR-032 `kind: code`. Each task: jest green, JSDoc on new props, the
> component reference doc generated.

## Implementation tasks

### Task 1: The brand resolver and the placement key
- **spec_ref**: `openspec/changes/screens-brand-block-top-bar/specs/layout-components/spec.md#requirement-an-app-can-keep-the-brand-block-in-the-navigation`
- **files**: `src/utils/resolveBrand.js`, `src/schemas/app-manifest-v2.schema.json`, `tests/utils/resolveBrand.spec.js`
- **acceptance_criteria**:
  - `nav.brand.placement` validates as `top-bar` or `nav`; another value fails
  - The resolver returns the same shape `CnAppNav` read before
- [x] Implement
- [x] Test

### Task 2: CnBrandBar and its place in CnAppRoot
- **spec_ref**: `openspec/changes/screens-brand-block-top-bar/specs/layout-components/spec.md#requirement-the-board-look-draws-the-brand-block-in-an-app-top-bar`
- **files**: `src/components/CnBrandBar/CnBrandBar.vue`, `src/components/CnAppRoot/CnAppRoot.vue`, `src/css/look-board.css`, `tests/components/CnBrandBar.spec.js`
- **acceptance_criteria**:
  - The bar renders under the board look with a brand, not otherwise
  - An app that replaces the navigation through `menu` still gets the bar
  - `placement: "nav"` renders no bar
- [x] Implement
- [x] Test

### Task 3: The navigation steps aside
- **spec_ref**: `openspec/changes/screens-brand-block-top-bar/specs/layout-components/spec.md#requirement-the-navigation-does-not-draw-a-brand-block-the-bar-already-draws`
- **files**: `src/components/CnAppNav/CnAppNav.vue`, `tests/components/CnBrandBar.spec.js`
- **acceptance_criteria**:
  - One brand block exists under the default placement
  - The `brand` slot of `CnAppNav` still renders when filled
- [x] Implement
- [x] Test

### Task 4: Sizes in a browser
- **spec_ref**: `openspec/changes/screens-brand-block-top-bar/specs/layout-components/spec.md#requirement-the-board-look-draws-the-brand-block-in-an-app-top-bar`
- **files**: `e2e/screens-brand-block-top-bar.e2e.js`
- **acceptance_criteria**:
  - 237px block, 34px emblem, 68px bar measured
- [ ] Implement
- [ ] Test — not run: needs a running Nextcloud instance; the stylesheet contract is pinned by a unit test
