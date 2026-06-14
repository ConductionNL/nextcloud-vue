# Manifest `config.mode: 'public'` — typed + detail-page support

## Why

The pipelinq triage flagged `PublicSurveyFormView` (token-scoped, unauthenticated form) as a custom because of the lack of public-mode binding in the manifest. The opencatalogi triage flagged `CredentialVerify` (token-scoped detail) for the same reason.

Status today:
- `type:'form'` **already** accepts `mode: 'public' | 'edit' | 'create'` — runtime is wired in `CnFormPage` (success banner, no auth state required, public-form semantics) and the validator enforces the enum. But the JSON Schema doesn't declare it, so editors give no completion + typos in adjacent manifests aren't surfaced by schema-only validators.
- `type:'detail'` has **no** `mode` support. Public credential-verification pages can't be declarative today.

## What changes

1. **Schema** — declare `mode` as a typed enum (`"edit" | "create" | "public"`) on `pages[].config`. Description points at the matching component prop / behaviour.
2. **Validator** — `case 'detail':` in `validateTypeConfig` validates `mode` as the same closed enum when set. (`case 'form':` already does this; the check is lifted into a shared helper.)
3. **Schema version** — 2.0.0 → 2.5.0 (sequential to 2.4.0).
4. **Docs** — document the public-mode pattern in `docs/components/cn-form-page.md` and `docs/components/cn-detail-page.md`, with token-binding via `@route.<param>` (the #276 sentinel) called out as the natural pairing for public surveys / credential verification.
5. **Tests** — validator coverage for form + detail `mode` enum.

## Non-goals

- Adding a `mode` prop to `CnDetailPage` + the data-fetch auth-bypass runtime. The schema + validation work makes the contract explicit; the runtime branch is tracked separately. (Today consumers already author `config.mode: 'public'` on detail pages — the manifest carries the intent, the host app passes data without auth headers. Once `CnDetailPage` grows native public-mode handling, no manifest changes are needed.)
- New auth-bypass infrastructure (token routes, signature verification, etc.) — those land in dedicated capabilities.

## Consumer impact

Unblocks:
- pipelinq `PublicSurveyFormView` → `type:'form'` + `config.mode: 'public'` + `config.token: '@route.token'` (paired with #276 sentinel).
- opencatalogi / decidesk `CredentialVerify` → `type:'detail'` + `config.mode: 'public'` + `config.id: '@route.id'`.

## References

- [nextcloud-vue#280](https://github.com/ConductionNL/nextcloud-vue/issues/280)
- [nextcloud-vue#276](https://github.com/ConductionNL/nextcloud-vue/pull/296) — `@route.<param>` sentinel for token binding.
- `CnFormPage.vue` line 228: existing `mode` prop with `public` value.
- `validateTypeConfig` `case 'form':` — existing enum check.
