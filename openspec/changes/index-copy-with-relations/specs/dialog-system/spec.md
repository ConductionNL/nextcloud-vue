# dialog-system Delta: index-copy-with-relations

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [index-copy-with-relations](../../)

## Purpose

A copy takes the source's links along when the page allows it: relation
rows, the objects that point at it, and its files. Row `land-copy-entry`
(stackiq matrix).

## ADDED Requirements

### Requirement: The copy dialog lists the links a copy can take along

When a page declares `config.copy.include`, `CnCopyDialog` SHALL list, for
each included kind (`relationRows`, `incoming`, `files`), the source's
linked items by title with a count, each kind ticked by default. The user
SHALL be able to untick any kind. A kind the page does not include SHALL
NOT be listed. A page without `config.copy.include` SHALL show the dialog
as before this change.

#### Scenario: An architect copies an application with its users

- GIVEN the Applications page declares `copy.include: ["incoming", "relationRows"]`
- AND the application "Zaaksysteem X" is used by 12 organisations and has 3 connections
- WHEN the architect chooses Copy on it
- THEN the dialog lists "Used by 12" and "Connections 3", both ticked

#### Scenario: A page that did not opt in is unchanged

- GIVEN a page without `copy.include`
- WHEN the user opens Copy
- THEN the dialog asks for the name pattern only

### Requirement: A copy with links is one OpenRegister request

A copy that takes any link along SHALL be made by one request to
OpenRegister's copy endpoint, carrying the new name and the ticked kinds.
The library SHALL NOT create links from the browser one by one. The
result phase SHALL show the per-link outcome the server returned and link
to the new object. A single-valued reference on another object SHALL NOT
be moved to the copy.

#### Scenario: The copy is used by the same organisations

- GIVEN the copy from the previous scenario was confirmed
- WHEN the architect opens the new application "Zaaksysteem X (kopie)"
- THEN it is used by the same 12 organisations
- AND "Zaaksysteem X" is still used by those 12 as well

#### Scenario: A link the user may not write is named

- GIVEN one of the 12 organisations is one the architect may not change
- WHEN the copy completes
- THEN the result lists that organisation as not linked, with the reason

### Requirement: Without the server copy, links are shown and not copied

When OpenRegister does not offer the copy endpoint, the dialog SHALL show
the link list read-only with a note that links are not copied, and SHALL
copy the fields only, as before this change.

#### Scenario: An older OpenRegister

- GIVEN an OpenRegister without the copy endpoint
- WHEN the architect copies an application on a page with `copy.include`
- THEN the dialog says the links will not be copied
- AND the copy carries the fields only
