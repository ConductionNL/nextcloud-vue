## ADDED Requirements

### Requirement: A copy can start with field values of its own

An index page with `copy.overrides` SHALL give every copy those field values over the source's, whether the copy goes
through OpenRegister's copy endpoint or is the fields-only copy, for a single and a mass copy. The new name SHALL still
be written to the name field.

#### Scenario: a copied application starts unpublished
- **GIVEN** `copy.overrides: { publicationDate: null, depublicationDate: null }`
- **WHEN** a user copies a published application
- **THEN** the copy is created without a publication date
