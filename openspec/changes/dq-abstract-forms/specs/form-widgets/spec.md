# form-widgets Delta

**Status**: proposed
**Scope**: nextcloud-vue

## ADDED Requirements

### Requirement: A form field picks a party or a scoped object by declaration

CnFormDialog SHALL draw `widget: "party"` as CnPartyPicker over the field's `sources`, storing the chosen row's id, and `widget: "resource"` as CnResourceSelect over `field.resource`, its `scope.value` token read from the page's object. CnResourceSelect with a `scope` SHALL offer the owner's rows first, then the unscoped ones whose `dedupeOn` key no owned row claims, every row when the owner is unknown, and say a failed read instead of drawing an empty picker. CnPartyPicker SHALL put a source's `secondary` template through the host translate.

#### Scenario: Role on a case

- **GIVEN** a case of type ct-1 and role types of ct-1, ct-2 and generic ones
- **WHEN** the Add party form opens
- **THEN** the Role field offers ct-1's own roles first, then the generic ones, without a generic one ct-1 already claims

### Requirement: A field list row opens a registered dialog

CnFieldListWidget SHALL offer a row action with `dialog` in a read-only list too, only on rows matching its `when` (which may compare two fields of the row) and whose `props` tokens all fill, and open the registered modal with those props. `placement: "inline"` SHALL draw it as a button in the row named by its `ariaLabel` template.

#### Scenario: Compare a redacted file

- **GIVEN** a file set whose second item went out redacted
- **THEN** only that row offers Compare, named "Compare advies.pdf with the original", and it opens the compare dialog with that item's address

### Requirement: A settings field asks dates, e-mail addresses and links in their own input

CnSettingsField SHALL draw `date`, `datetime-local` (also `datetime`, `date-time`), `email` and `url` as a text field of that input type, keeping the value as the text the input holds.
