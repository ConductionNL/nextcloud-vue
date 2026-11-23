# timeline Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [timeline-audit-trail-link](../../)

## ADDED Requirements

### Requirement: The manage timeline can point at the audit trail in the sidebar

With `auditTrailLink` set, the manage timeline SHALL draw a link button in its footer, beside the event count, worded
"Full audit trail in the sidebar" or the label given. Activating it SHALL open the object sidebar and ask for its
audit trail tab, `auditTrailTab` or else `auditTrail`, through the injected `objectSidebarState`. When no `objectSidebarState` is provided, or the key is
absent, the link SHALL NOT be drawn.

#### Scenario: DqZaakHistorie

- **GIVEN** a case page with an object sidebar and the history timeline with `auditTrailLink: true`
- **WHEN** the handler activates "Volledige audit trail in de zijbalk" under the history
- **THEN** the sidebar opens on the audit trail tab

#### Scenario: No sidebar on the page

- **GIVEN** the same timeline on a page without an object sidebar
- **THEN** no audit trail link is drawn
