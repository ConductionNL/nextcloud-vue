# index-form-eyebrow-subtitle Delta: index-page

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [index-form-eyebrow-subtitle](../../)

## ADDED Requirements

### Requirement: An index page's form can carry an eyebrow and a subtitle

CnIndexPage SHALL take `formEyebrow` and `formSubtitle` (page `config.formEyebrow` / `config.formSubtitle`), each a string for both modes or `{ create, edit }`. It SHALL pass the entry for the open mode, through the host `cnTranslate`, as `eyebrow` and `subtitle` to its built-in CnFormDialog or CnAdvancedFormDialog. A row action's own form (another pair) and a page without the props SHALL draw none.
