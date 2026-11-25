# sidebar-tab-mounts-on-open Delta: object-sidebar

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [sidebar-tab-mounts-on-open](../../)

## ADDED Requirements

### Requirement: A sidebar tab mounts its content when first opened

CnObjectSidebar SHALL list every tab it shows, and SHALL mount a tab's content (its component, its widgets, a registry provider's tab or a built-in tab's body) only once that tab has been the open tab. A tab's content SHALL stay mounted after the reader leaves the tab, so its state is kept when they return.

#### Scenario: The page opens on the first tab

- GIVEN a sidebar with the tabs Audit trail, Sharing and Access
- WHEN the page opens on Audit trail
- THEN only Audit trail's content is mounted
- AND Sharing and Access are listed but read nothing

#### Scenario: The reader opens a second tab and comes back

- GIVEN the reader opened Sharing after Audit trail
- WHEN they go back to Audit trail
- THEN Audit trail and Sharing stay mounted and neither mounts again
