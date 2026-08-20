---
kind: code
---

# Proposal: widget-registry-public-flag

## Summary

Add `public: boolean` to every `dashboardWidgetRegistry` entry, defaulting to
`false`, and add a markdown widget. A public-host renderer mounts only
`public: true` entries; anything else renders an inert placeholder.

Chain link 2 of `hydra/openspec/changes/portaliq-phase-two`. Implements ADR-084
§5 and the markdown half of ADR-086 §4.

## Motivation

The registry is the fleet's single widget catalog — 40 registered types, 39
`Cn*Widget` renderers, consumed by OpenBuild and LaunchPad (whose own registry
file is a thin re-export with four host overrides). Portaliq is about to become
a third consumer, at a **public origin**.

Today, registering a widget makes it available everywhere the registry is read.
That is correct for two authenticated in-Nextcloud consumers and wrong for an
anonymous one: a widget that reads an authenticated Nextcloud API would become
mountable by an unauthenticated visitor purely by being added to the shared
catalog. The registry has to be able to say no, and it has to say no by
default (ADR-005).

Separately, the CMS needs prose inside a grid page. `CnWikiPage` and
`cnRenderMarkdown` already exist; a markdown **widget** does not.

## Affected Projects

- [ ] `nextcloud-vue` — `registerDashboardWidget()` accepts and records
      `public`; a public-host render path filters on it; `CnMarkdownWidget`
      plus its form.
- [ ] `launchpad` — no behaviour change; its four host-override registrations
      inherit `public: false`.

## Design notes

**Default closed.** `public` is `false` when unspecified. A widget author opts
in deliberately, and the review of that opt-in is the security review that
matters.

**Degrade, do not blank.** An unknown or non-public `widgetKey` renders an
inert placeholder and logs a warning. A page with one bad widget still shows
its other three — a page that throws shows nothing, which is a worse failure
for a public site than a missing tile.

**The markdown widget renders the existing path.** `cnRenderMarkdown`, not a
second renderer.

## Risks

- **This is the change where a mistake is silent and serious.** A widget
  wrongly marked `public: true` is an authenticated capability exposed
  anonymously, and nothing about the page will look wrong. The gate must be
  shown failing on a deliberately non-public widget before its silence is read
  as a pass.
- **A gate can be present and decide nothing.** Portaliq's interim
  implementation of this rule (2026-08-15) kept an allow-list `Set` *and* a
  hard-coded `widgetKey === 'markdown'` render condition. Adding a widget to
  the allow-list therefore changed no behaviour: the mutation test that added
  `files` to it **passed**, because the second condition kept the placeholder
  in place. The gate looked real, read as real in review, and was decorative.

  The fix was structural, not a stronger test: the allow-list became a
  `key → component` map, so the decision and the rendering are one thing and a
  mutation of it is observable. **The registry filter here must be built the
  same way** — a `public` flag consulted *beside* an independent render
  condition is the same defect with a different spelling.
- Markdown rendering at a public origin is an XSS surface. The existing
  sanitisation path applies and must be asserted, not assumed, for the widget.
