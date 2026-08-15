---
kind: code
---

# Proposal: public-manifest-runtime

## Summary

Give `bootstrapCnApp()` a `host: 'nextcloud' | 'public'` option so a manifest-v2
app can boot at a public origin — outside Nextcloud, with no `requesttoken`, no
`generateUrl` and no `OC*` globals. Confined to boot, URL resolution, transport
auth and router base. **No `Cn*` component changes and no component takes a
`host` prop.**

Chain link 1 of `hydra/openspec/changes/portaliq-phase-two`. Implements the
runtime half of ADR-084.

## Motivation

Portaliq ships a second, bespoke React front-end (7 files, 1,208 lines of JSX,
its own webpack config) purely because the shared runtime assumes Nextcloud: an
`#app-content` mount, the `requesttoken` CSRF idiom, `@nextcloud/router`'s
`generateUrl`, and an authenticated `OCP` session. The public portal has none
of those — it is served from nginx at a public origin and authenticates with a
bearer session.

That is a boot-and-transport gap, not a rendering one. Every page type, every
widget and every form field is already agnostic to which it runs under. Closing
it lets the public portal use the grid, the 40-type communal widget catalog and
`CnFormPage` instead of reimplementing all three (ADR-071: nc-vue owns the
frontend runtime).

## Affected Projects

- [ ] `nextcloud-vue` — `bootstrapCnApp()` gains `host`; `cnFetch` gains a
      bearer credential path and a configurable base; router base resolution
      moves behind the same option.

## Design notes

Exactly four things differ between hosts:

| | `nextcloud` | `public` |
| --- | --- | --- |
| mount | the app's known element | caller-supplied element |
| URLs | `generateUrl` | runtime-configured base |
| auth | `requesttoken` | bearer credential |
| router base | app route | configured base |

If a component needs to know the host, that is a signal it carries a Nextcloud
dependency it should not have. The fix is in the component, not a branch at the
call site.

## Risks

- **A second boot path rots unless CI exercises it.** The integration test boots
  with the Nextcloud globals **deleted**, and is first run against
  `host: 'nextcloud'` in the same environment to observe it fail. A test that
  passes because the environment happened to supply `OC` proves nothing.
- **A public origin is a different threat model.** This change only makes the
  runtime bootable there; what may be *rendered* there is gated separately
  (link 2, the `public` widget flag).
- Bearer credential handling in `cnFetch` must not leak the token into URLs,
  logs, or error payloads.
