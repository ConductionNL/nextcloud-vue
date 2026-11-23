# data-widget-tag-pills Delta: data-widget

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [data-widget-tag-pills](../../)

## ADDED Requirements

### Requirement: A tags field can read as pills to remove and add

A field with `overrides[key].widget: "tags"` and `tagPills: true` SHALL read as one pill per tag. While the field is editable each pill SHALL carry a remove button (aria-label "Remove {label}") that saves the field without that tag at once, and an add button (`addTagLabel`, default "+ Label") SHALL open the tags editor. A read-only field SHALL show the pills only. The field's `hint` SHALL stay under the value. Without `tagPills` the field SHALL read as before.
