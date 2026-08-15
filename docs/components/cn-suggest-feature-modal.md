# CnSuggestFeatureModal

Proposal-grade feature-request dialog. Five structured fields (`title`,
`problem`, `proposedSolution`, `whoBenefits`, `priorityToYou`) plus one optional
context field (`anythingElse`), with auto-captured context (`app`, `page`,
`surface`, `object`, `specRef`).

On submit the modal does **not** post anywhere — it opens a pre-filled "new
issue" deep-link on the configured forge in a new tab; the user reviews and
submits under their own forge account. Fully client-side: no app token, no
proxy, no server-side write path.

## Forge configuration

The target forge is set by the `forge` prop and defaults to **Codeberg**
(the fleet's current source of truth). Each forge type is deep-linked
differently — see [`src/utils/forge.js`](../../src/utils/forge.js):

| `forge.type` | How the issue is pre-filled |
|---|---|
| `codeberg` (default) / `forgejo` / `gitea` | Forgejo/Gitea only support `?title=` + `?body=`, so the structured fields are assembled into a Markdown `body`. |
| `github` | GitHub Issue Forms support per-field deep-linking: `template=feature-request.yml` plus one query param per form-field id (`problem`, `proposed-solution`, …). |

Switching the whole fleet's forge is a one-line manifest change
(`nav.forge`); see [CnAppRoot](cn-app-root.md) and the manifest schema. For
`forgejo`/`gitea` a `baseUrl` is required (self-hosted); `codeberg`/`github`
fall back to their canonical public hosts.

## Props

| Prop | Type | Required | Notes |
|---|---|---|---|
| `repo` | String | Yes | `<owner>/<repo>` slug on the forge (e.g. `Conduction/pipelinq`). |
| `forge` | Object | No | `{ type, baseUrl? }`. Selects the target forge + URL strategy. Defaults to `{ type: 'codeberg', baseUrl: 'https://codeberg.org' }`. |
| `specRef` (`spec-ref`) | String | No | Optional kebab-case capability slug linking the suggestion to an existing spec capability. Typically supplied via `useSpecRef()`. |
| `conductionSubmitEnabled` | Boolean | No (`false`) | Enables the secondary "Send to Conduction" button (Path B) alongside the primary forge deep-link. Disabled with a tooltip until the host opts in. |

### Context props

Each is auto-captured by the host (e.g. `CnActionsMenu` / `CnFeaturesAndRoadmapView`) and forwarded into the issue so the request records where it originated.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `app` | String | `''` | Host app id. |
| `page` | String | `''` | Page id / route the request was raised from. |
| `surface` | String | `''` | Surface (e.g. `widget:<id>`, `detail:<id>`, `dashboard:<id>`). |
| `object` | String | `''` | OpenRegister object reference (register · schema · uuid). |

## Events

| Event | Payload | Trigger |
|---|---|---|
| `submit-conduction` | `{title, problem, proposedSolution, whoBenefits, priorityToYou, anythingElse, repo, specRef, app, page, surface, object}` | user clicks "Send to Conduction" (only when `conductionSubmitEnabled`) |
| `close` | — | user cancels, or after either submission path hands off |

The primary "Continue on \<forge\>" button opens the deep-link via
`window.open(...)` and then emits `close` — there is no success event for
Path A, since submission completes on the forge.

## Security

Validation is purely client-side (length checks per field). The deep-link is
built with `URLSearchParams`, so all field content is URL-encoded.

## Reference

- Spec: `openspec/changes/add-features-roadmap-menu/specs/features-roadmap-component/spec.md`
  → Requirement "CnSuggestFeatureModal"
- Forge URL builder: [src/utils/forge.js](../../src/utils/forge.js)
- Implementation: [src/components/CnSuggestFeatureModal/CnSuggestFeatureModal.vue](../../src/components/CnSuggestFeatureModal/CnSuggestFeatureModal.vue)
