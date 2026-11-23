# Tasks: row-action-openregister-verbs

- [x] 1.1 Built-ins match their governing OpenRegister verb as well as their id; app actions keep exact id matching
  - **spec_ref**: `specs/index-page/spec.md#requirement-built-in-row-actions-match-openregister-permission-verbs`
  - **files**: `src/utils/rowActionAvailability.js`
- [x] 1.2 Refusal reasons for a built-in follow its verb; its own id's reason wins
  - **spec_ref**: `specs/index-page/spec.md#requirement-a-built-in-carries-the-refusal-reason-of-its-verb`
- [x] 1.3 A verb a declared built-in uses is not reported as undeclared
  - **spec_ref**: `specs/index-page/spec.md#requirement-built-in-row-actions-match-openregister-permission-verbs`
- [x] 1.4 Tests over the three block shapes; docs, design D-6 of `row-action-builtin-placement`, and CHANGELOG
