# CnSuggestFeatureModal

Feature-request submission dialog. Title field (3–200 chars, required), body
markdown textarea (≥ 10 chars, required), live markdown preview, optional hidden
`specRef` field. On submit, POSTs to OpenRegister's `github-issue-proxy` with the
Nextcloud CSRF token.

## Props

| Prop | Type | Required | Notes |
|---|---|---|---|
| `repo` | String | Yes | `<owner>/<repo>` slug — sent as the `repo` field in the submission body. |
| `specRef` (`spec-ref`) | String | No | Optional kebab-case capability slug. When set, the modal includes it in the POST body, the backend applies a `specRef:<slug>` label and a body suffix per the spec. Typically supplied via `useSpecRef()` from the surrounding context. |

## Events

| Event | Payload | Trigger |
|---|---|---|
| `submitted` | `{number, html_url, state, specRef?, used_server_pat}` | POST returns 201 |
| `close` | — | user cancel OR after `submitted` |

## Error states

| Server response | Handling |
|---|---|
| 201 | emit `submitted`, close |
| 400 (validation) | inline error, dialog stays open |
| 412 (CSRF / not authed) | passes through framework's middleware error |
| 429 (rate limited) | inline "Submitting too fast — wait Ns" message |
| 503 (PAT not configured) | inline "GitHub submissions not configured" message |

## Security

The live preview uses the same `cnRenderMarkdown` → `DOMPurify.sanitize()`
pipeline as `CnRoadmapItem`, with the exported `SAFE_MARKDOWN_DOMPURIFY_CONFIG`.

## Reference

- Spec: `openspec/changes/add-features-roadmap-menu/specs/features-roadmap-component/spec.md`
  → Requirement "CnSuggestFeatureModal"
- Implementation: [src/components/CnSuggestFeatureModal/CnSuggestFeatureModal.vue](../../src/components/CnSuggestFeatureModal/CnSuggestFeatureModal.vue)
