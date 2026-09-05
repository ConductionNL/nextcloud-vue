---
kind: code
---

# Proposal: setup-choice-cards

## Summary

A `choice` step in the setup wizard can render as a grid of cards instead of a
dropdown, and can read its options from the app's own setup status document
instead of restating them in the manifest. Adds `CnChoiceCards`, the two
manifest keys that reach it (`display: "cards"` and `optionsSource`), and
`titleTag` on `CnCard`.

## Motivation

Every app's demo-data step is a Run button under a paragraph. The paragraph
says the data is safe to load and safe to delete; the button says Run. Neither
says what is about to land in the operator's register.

decidiq now ships four example sets, one per kind of organisation, and asks
which one to load. Behind an `NcSelect` that question reads as six words with
no content: "Municipality", "Association or VvE", "Works council". The thing
that makes the choice answerable is the description of what each set contains
and how many objects it carries, and a dropdown has nowhere to put it.

The server already knows all of it. `GET /api/setup/status` returns decidiq's
`profiles` with a label, a description and an object count each. The manifest
was carrying a second, hand-written copy of that list, guarded by a unit test
whose only job was to notice the two drifting apart.

## Affected Projects

- [ ] `nextcloud-vue` — `CnChoiceCards`, wizard support for `display` and
      `optionsSource`, `titleTag` on `CnCard`, manifest schema 2.33.0.
- [ ] `decidiq` — first consumer: multi-select cards over its four example sets.
- [ ] `.github` — hydra-gates vendors the manifest schema and needs 2.33.0 to
      accept `display`.

## Design notes

**A label around a real input, not a clickable div.** Each card wraps a native
radio, or a checkbox when the step is `multiple`. Keyboard support, the checked
state, the focus ring and Windows high-contrast rendering come from the
browser. The input stays visible, so the selection does not depend on the
card's highlight colour (WCAG 1.4.1).

**The server owns the list.** `optionsSource` names a key in the status
document the wizard's own contract already serves. No second endpoint, no
second round trip: `useSetupStatus` caches per app id, so the fetch the host
already made is the one that answers.

**Card titles are not headings.** `titleTag="span"` keeps six options from
becoming six `h2`s in the document outline.

**Cards are opt-in.** `display` defaults to `select`, so every existing choice
step renders exactly as it did.

## Risks

- **A step that asks for cards but declares no `optionsSource` is silent about
  it.** An empty option list renders the "nothing to choose from" note rather
  than an error, because a status document that has not arrived yet looks the
  same as one with no such key. The empty state has to be readable, and it is
  tested.
- **`multiple` was declared in the schema and never rendered as a multi-select
  anywhere.** The card grid is its first real consumer, so the value shape it
  posts (an array) is new to every `SetupController` that has to accept it.
