## ADDED Requirements

### Requirement: A field offers only the values its controlling field allows

A form field whose property (or items) declares `x-openregister-dependent-values` SHALL offer only the values in the
row of the controlling field's current value, and all its values when the table has no row for that value. When the
controlling field changes, the form SHALL clear a held value that the new row does not allow.

#### Scenario: a closed-source module
- **GIVEN** `licence` with `controlledBy: licentietype` and `allowed: { "Closed source": [] }`
- **WHEN** the licence type is Closed source
- **THEN** the licence field offers no options and a licence picked before is cleared
