# Tasks: index-count-plural

### Task 1: A plural countSubtitle
- **spec_ref**: `openspec/changes/index-count-plural/specs/index-header/spec.md#requirement-the-count-line-takes-a-singular-and-a-plural-form`
- **files**: `src/components/CnIndexPage/CnIndexPage.vue`, `src/schemas/app-manifest-v2.schema.json`
- [x] Implement: `countSubtitle` as `{ singular, plural }` through `translatePlural` with `cnAppId`
- [x] Test: `tests/components/CnIndexPageCountPlural.spec.js`, `tests/schemas/app-manifest-v2.schema.spec.js`
