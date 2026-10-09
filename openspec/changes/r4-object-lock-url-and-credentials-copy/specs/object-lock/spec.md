# object-lock Delta: r4-object-lock-url-and-credentials-copy

## ADDED Requirements

### Requirement: The lock request names the object, never a getter

`useObjectLock` SHALL accept register, schema, schema slug and object id as a
plain value, a ref or a getter function, and SHALL put their values in the
lock and unlock URLs. It SHALL send no lock or unlock request while any of
register, schema slug or object id is empty.

#### Scenario: A detail page opens its edit form

- **GIVEN** a `CnDetailPage` for register `pipelinq`, schema `client`, object `abc-123`
- **WHEN** the page takes the lock
- **THEN** it sends `POST /apps/openregister/api/objects/pipelinq/client/abc-123/lock`
- **AND** no part of the path contains a function's source

#### Scenario: The register is not known yet

- **GIVEN** a detail page whose register has not resolved
- **WHEN** the page would take or hand back the lock
- **THEN** no request is sent

#### Scenario: The register arrives after mount

- **GIVEN** a detail page mounted without a register
- **WHEN** the register prop is set and the page takes the lock
- **THEN** the lock URL carries that register
