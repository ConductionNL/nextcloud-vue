# manifest-detail-related-and-aggregates Specification

## ADDED Requirements

### Requirement: A related-object row names the object, never a number

`CnRelatedObjectsWidget` SHALL label an object row from the object's title fields, then from `givenName` and `familyName`, then from its schema's title. When `@self.schema` is a numeric id the widget SHALL read that schema's title once per page before it renders the rows, and SHALL translate it through the injected `cnTranslate`. The row SHALL show the schema title beside the label unless it repeats the label. The widget SHALL NOT show a numeric schema id as a label or meta.

#### Scenario: An object without a name reads as its schema
- **GIVEN** a related object whose `@self.name` is its uuid and whose `@self.schema` is `"120"`, the schema titled "Conference Signup"
- **WHEN** the Related panel renders
- **THEN** the row reads "Conference Signup" and no number

#### Scenario: A person reads by name
- **GIVEN** a related learner profile with `givenName` "Vera" and `familyName` "Hulstkamp"
- **WHEN** the Related panel renders
- **THEN** the row reads "Vera Hulstkamp" with the schema title beside it

#### Scenario: An unreadable schema shows no number
- **GIVEN** the schema of a related object cannot be read
- **WHEN** the Related panel renders
- **THEN** the row shows its label and no meta
