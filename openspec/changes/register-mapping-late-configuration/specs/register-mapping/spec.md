# register-mapping Delta: register-mapping-late-configuration

## ADDED Requirements

### Requirement: A configuration that arrives while the registers load still gets its schemas

When the registers have loaded, CnRegisterMapping SHALL read the schemas of every register the current configuration maps.

#### Scenario: dossiq admin
- GIVEN the configuration arrives after mount, while the registers request is pending
- THEN the mapped register's schemas are read and the schema selects offer them
