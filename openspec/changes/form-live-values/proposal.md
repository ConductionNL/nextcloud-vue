---
kind: code
depends_on: []
---

# Proposal: form-live-values

## Why

A form should fill in what it can work out. Pick "Netherlands" and the
currency is euro; pick a permit size and the fee follows; open the form
and your own name and e-mail are already there. The library's forms show
and hide fields by other fields, but never set one: every value is typed
by the person or copied once from a static `initialValue` when the form
opens.

## Row

| matrix | row | name | own rating | built |
|---|---|---|---|---|
| buildiq | `form-conditional-values` | Fill in a form field automatically from the answer to another field. | no | none |

Built evidence: "Form logic hides and shows fields only ... evaluated by
nextcloud-vue v2.55.1 CnFormPage.vue:485-510; grep -iE 'setValue|assign'
in CnFormPage.vue finds no rule that sets another field's value".

Demand: feature request, https://forum.nocobase.com/t/9935
("NocoBase forum feature request 9935, 2026-01-10").

## Competitor evidence, quoted from the buildiq matrix

- NocoBase, yes: "linkageRules.tsx:1023 'Field assignment' in field
  linkage rules fills a field from another field's answer while the form
  is edited", https://github.com/nocobase/nocobase (v2.2.18)
- Budibase, yes: "form fields have an 'On change' action setting ...
  that can run 'Update Field Value' on another field",
  https://github.com/Budibase/budibase (v3.46.0)
- Mendix, yes: "the On change event of an input element runs a nanoflow
  or microflow that can set another attribute from the chosen answer",
  https://docs.mendix.com/refguide/on-click-event/#on-change
- Microsoft Power Apps, yes: "dependent drop-down lists and Default
  formulas fill one field from the answer to another",
  https://learn.microsoft.com/en-us/power-apps/maker/canvas-apps/dependent-drop-down-lists
- Appsmith, partial: a default value bound to another field, written as
  JavaScript.

## Sibling half this change also covers

buildiq `forms-live-values-and-checks` names three generic hooks it
needs from the renderer and does not want to fork it for: "resolve a
field `default` through its existing sentinel resolver, call a
host-provided resolver for fields marked `calculate` when the answers
they read change, and render a host-provided list of unmet conditions.
The sentinel vocabulary ... also needs `@me.displayName` and
`@me.email`." Its REQ-BQLV-001 to REQ-BQLV-003 wait on them.

## What changes

- A field may declare `assign` rules: when a condition on the other
  answers holds, set this field to a value. The value is a literal,
  another answer (`@answer.<field>`) or a sentinel token.
- A field's `default` may be a sentinel token, resolved when the form
  opens: `@me`, `@me.displayName`, `@me.email`, `@today`, `@now`, and
  `@object.<field>` when the form opens from a record.
- A field may be `calculate`d by a resolver the host provides; the form
  calls it when the answers the field reads change, and shows the result
  read-only.
- A form page may show a host-provided list of unmet conditions beside
  its submit button and hold the submit while any is listed.

## Affected projects

- `nextcloud-vue`: `CnFormPage`, `CnFormDialog` (assign and default),
  `src/utils/sentinelTokens.js`, `src/utils/resolveFilterTokens.js`,
  the manifest v2 schema (`formField`).
- Consumers: buildiq forms, portaliq intake forms, pipelinq and dossiq
  intake dialogs.

## Backward compatibility

A field without `assign`, a token `default` or `calculate` behaves as
before. `initialValue` still wins over a `default` for a field it sets,
so an edit form never overwrites stored data with a default.

## Out of scope

- A formula language. `assign` takes a literal, another answer or a
  token; anything computed is the host's `calculate` resolver, which for
  buildiq is its rule engine.
- Server-side recomputation on save. That is buildiq's REQ-BQLV-005 and
  OpenRegister's events.
