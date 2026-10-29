# connections-chip-gap Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [connections-chip-gap](../../)

## Purpose

The connections panel's status chips keep the board's spacing on a Nextcloud page.

## ADDED Requirements

### Requirement: The status chips stand 8px apart

CnConnectionsPanel's status chips SHALL stand 8px apart. Nextcloud's server margin on plain buttons SHALL NOT add to
that gap.

#### Scenario: Board PqIntegrations

- GIVEN the Pipelinq integrations settings page
- WHEN the status chips render
- THEN the space between "Alle koppelingen" and the next chip is 8px
