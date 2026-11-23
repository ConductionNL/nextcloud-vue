# board-matrix-tones Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-matrix-tones](../../)

## Purpose

A board matrix's tones are the theme's status grounds.

## ADDED Requirements

### Requirement: A board matrix cell takes the theme's status grounds

In the board look, a matrix cell toned success, warning or error SHALL take the theme's status badge background of that
tone, and a danger cell its own token or the error ground deepened.

#### Scenario: DqHandhaving

- **WHEN** a handler opens an LHS advice under the Zuiddrecht theme
- **THEN** the cells read #E7F3EA, #FFF4DE, #FCEDEC and about #F6D6D3 as the board
