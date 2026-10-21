# Tasks: mail-tab-compose-and-link

### Task 1: The mail tab can carry Compose mail and Link mail in its header
- **spec_ref**: `openspec/changes/mail-tab-compose-and-link/specs/mail-tab-compose-and-link/spec.md#requirement-the-mail-tab-can-carry-compose-mail-and-link-mail-in-its-header`
- **files**: `src/components/CnMailTab/CnMailTab.vue`, `src/integrations/builtin/email/CnEmailTab.vue`, `l10n/en.json`, `l10n/nl.json`, `docs/components/cn-mail-tab.md`, `docs/components/cn-email-tab.md`
- [x] Implement: `headerActions`, CnEmailTab `showActions`
- [x] Test: `tests/components/CnMailTab.spec.js`, `src/integrations/builtin/email/__tests__/CnEmailTab.spec.js`
