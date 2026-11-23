## ADDED Requirements

### Requirement: A form page can ask for a list of objects

A form field with `widget: "sub-objects"`, or of type array with an object item schema, SHALL be a table of rows edited
over the item schema and SHALL store an array of objects. With `maxItems` the field SHALL take no more rows than that.
A required list SHALL need at least one row.

#### Scenario: three products in one request
- **GIVEN** a product list field with `maxItems: 10`
- **WHEN** the applicant adds a parking permit, a waste pass and a dog tag
- **THEN** the form stores three objects under the field's key
