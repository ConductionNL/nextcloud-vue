# detail-page Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [header-widget-follows-tab](../../)

## ADDED Requirements

### Requirement: The header widget can stand aside for a tab

The widget named by `headerWidget` SHALL NOT render in the header while a body tab named in its definition's `notTabs`
is open, and, when its definition has `tabs`, SHALL render only beside those tabs. It SHALL NOT render in the body grid
instead. Edit mode SHALL show it.

#### Scenario: DqZaakAssistent

- **GIVEN** the case page's `case-stages` header widget declares `notTabs: ["ai-oversight"]`
- **WHEN** the handler opens AI-toezicht
- **THEN** the header shows no stages bars and the body grid does not hold them either
