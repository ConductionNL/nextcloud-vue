# index-page Delta: index-page-embedded

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [index-page-embedded](../../)

## Purpose

An index page works on a page without a router.

## ADDED Requirements

### Requirement: An embedded index page opens rows in place

With `embedded`, a row click (also while `selectable`) and the View action SHALL NOT navigate. They SHALL open `rowModal` through the injected `cnOpenModal` with `rowModalProps`, `objectId` and `object` (the row); without `rowModal` (or without `cnOpenModal`) they SHALL open the built-in form dialog on the row, unless the host listens to `row-click`, which then hears the click as before.

#### Scenario: Opening a staff member on the admin page

- **GIVEN** an embedded index page with `rowModal: 'PosStaffForm'` and a host that provides `cnOpenModal`
- **WHEN** the administrator clicks the row of "Anna"
- **THEN** the host opens PosStaffForm with `objectId` and `object` of that row, and nothing navigates

#### Scenario: Editing a category

- **GIVEN** an embedded index page without `rowModal`
- **WHEN** the administrator clicks a row
- **THEN** the built-in form dialog opens on that row

### Requirement: An override brings back a field the schema hides

`fieldsFromSchema` SHALL leave out a property with `visible: false`, unless its override says `hidden: false`.

#### Scenario: A category's description on the admin form

- **GIVEN** a schema whose `description` is `visible: false`
- **WHEN** the form is built with `fieldOverrides: { description: { hidden: false } }`
- **THEN** the form has a description field
