# board-underline-tabs Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-underline-tabs](../../)

## Purpose

Underline tabs keep their own spacing and look under Nextcloud's core button margin and a theme's button rules.

## ADDED Requirements

### Requirement: Underline tabs keep their gap, weight and underline under a theme

An underline tab SHALL draw no margin of its own, so tabs sit 4px apart, and SHALL set the nldesign button tokens to
weight 500 (700 for the open tab), radius 0 and border width 0 0 3px.

#### Scenario: DqInstellingen

- **GIVEN** dossiq's admin settings under the nldesign theme
- **THEN** "Algemeen", "Systeem" and "Integraties" are 4px apart at weight 500, the open one at 700 over a 3px underline
