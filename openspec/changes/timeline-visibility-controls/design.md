# Design: the timeline visibility chip, toggle and filter

## Component and surface

`src/components/CnNotesCard/CnNotesCard.vue`,
`src/integrations/builtin/activity/CnActivityTab.vue` and
`src/integrations/builtin/activity/CnActivityCard.vue`.

Kind: code. Three props, one chip, one toggle, one filter.

## D1. The permission arrives as a prop, it is not inferred

`canSetVisibility` is a boolean the host passes. The component does not
read the current user, does not compare owners and does not call an
authorization endpoint. Three reasons. The server decides anyway and will
refuse a write the component allowed. A component that guesses a
permission is a component that is wrong in the one deployment nobody
tested. And the same card renders in the portal, where the answer is
always no.

## D2. Absent reads as internal

An entry without a visibility value renders as internal. That is
OpenRegister's own read-time fallback (task 1.1 of
`timeline-entry-visibility`: "default and read-time fallback
`internal`"). Matching it here means an app upgrading the library before
the backend does not suddenly show old notes as public.

## D3. The choice is made before the write

The add-note form carries the toggle, defaulting to internal. A note
written public by accident and corrected a minute later was public for a
minute, and in a case file that is the incident. So the choice is part of
writing, not part of editing afterwards. Changing it afterwards is still
offered, because OpenRegister audits that change.

## D4. The filter tells the truth about itself

A caller without `update` is served the public view whatever they ask for
(task 2.1 of the openregister change). In that case the filter chip
renders fixed at public with the reason, rather than offering three
options two of which do nothing. A control that appears to work and does
not is worse than no control.

## D5. The chip is a chip, not a colour

Internal and public are distinguished by their label first. Colour is a
reinforcement, never the signal, per WCAG 2.2 AA 1.4.1. A timeline read
by a citizen and by a handler is exactly where that matters.

## Risks

- **A host that passes `canSetVisibility` from the wrong place.** The
  prop is documented as "may this caller set visibility on this object",
  the same answer the server gives for `update`, and the reference doc
  says so. A toggle shown wrongly still fails at the server, visibly.
- **Old entries after the backend ships.** They have no flag and read as
  internal, which is the safe direction.
- **Two write paths.** The add-note form and the later toggle both write
  visibility. They call the same store action so there is one place where
  the value is sent.
