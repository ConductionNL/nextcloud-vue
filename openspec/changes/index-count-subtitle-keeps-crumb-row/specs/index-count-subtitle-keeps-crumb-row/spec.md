# index-count-subtitle-keeps-crumb-row Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [index-count-subtitle-keeps-crumb-row](../../)

## Purpose

An index page's breadcrumb row stands under its title whatever else the header shows.

## ADDED Requirements

### Requirement: The breadcrumb row stays under the title

In the board look the `.cn-header-trail` of an index page header SHALL sit in the title's column on the row under the
title, and a `.cn-page-header__description` that follows it SHALL sit on the row after it.

#### Scenario: A list with a count line and a breadcrumb

- **GIVEN** an index page with `countSubtitle`, `breadcrumb` and header buttons in the board look
- **THEN** the breadcrumb row is directly under the title on the left, and the count line under the breadcrumb row
