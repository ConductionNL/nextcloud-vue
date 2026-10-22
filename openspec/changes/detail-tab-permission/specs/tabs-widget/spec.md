# tabs-widget Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [detail-tab-permission](../../)

## ADDED Requirements

### Requirement: A detail tab can name the permission it needs

A `tabs` widget entry with `permission` SHALL be drawn only for a viewer who holds that permission, and SHALL be drawn
when the app provides no permissions, as a page tab and a menu entry are. It decides only whether the tab is drawn.

#### Scenario: The case page's Indication tab

- **GIVEN** the Indication tab names `sociaal-domein`
- **WHEN** a handler without that permission opens a case
- **THEN** the tab strip has no Indication tab, and a social-domain handler's has it
