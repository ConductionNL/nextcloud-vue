# record-widgets Delta: facts-link-opens-sidebar-tab

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [facts-link-opens-sidebar-tab](../../)

## ADDED Requirements

### Requirement: A facts link can open a sidebar tab

A facts card whose `content.link` names a `sidebarTab` SHALL draw its foot link as a button with the link's label and
optional icon, and pressing it SHALL open the page's object sidebar on that tab. On a page that provides no object
sidebar the link SHALL NOT be drawn.

#### Scenario: DqContact side history

- **GIVEN** a facts card with `link: { label: "View history", icon: "History", sidebarTab: "audit" }` on a contact page
- **WHEN** the reader presses "Historie bekijken"
- **THEN** the object sidebar opens on its History tab
