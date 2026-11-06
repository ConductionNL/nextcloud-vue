# party-picker-kind-switch Delta: party-picker-kind-switch

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [party-picker-kind-switch](../../)

## ADDED Requirements

### Requirement: A party picker can switch between kinds

CnPartyPicker SHALL take `kindSwitch` (`{ label }`). With it and more than one source, a CnSegmentedControl named by `label` SHALL show one segment per source, named by its `kind` (else its `label`) through the host translate, the first chosen, and only the chosen source SHALL be searched; switching SHALL clear the list and search the new source for the last term. CnFormDialog SHALL forward a party field's `kindSwitch`. Without `kindSwitch` every source SHALL be searched as before.

### Requirement: A form keeps the whole choice

A CnFormDialog `party` field with `choiceKey` SHALL hold the picker's `select` payload in the form data under that key, and null when the field is cleared, so a host can store more than the id. Without `choiceKey` the form data SHALL hold only the id.

#### Scenario: A contact has no register row

- **WHEN** a person picks a contact in a party field with `choiceKey: "requesterChoice"`
- **THEN** the form data SHALL hold the contact's id under the field's key and the choice under `requesterChoice`
