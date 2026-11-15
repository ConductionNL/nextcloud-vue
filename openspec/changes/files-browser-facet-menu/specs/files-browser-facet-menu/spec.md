# files-browser-facet-menu Delta: files-browser-facet-menu

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [files-browser-facet-menu](../../)

## ADDED Requirements

### Requirement: A files facet can be a toolbar menu

CnFilesBrowser SHALL take `facetPresentation` (`chips` default, or `menu`). With `menu` each facet SHALL be a toolbar menu named "<column>: <chosen value>", or "<column>: " and `facetAllLabel` (default "all") without a choice, holding "all" and every value in use with its count; choosing a value SHALL keep the files with that value, "all" SHALL clear it, and the chip row SHALL not be drawn. CnFilesTab SHALL forward `facetPresentation`.
