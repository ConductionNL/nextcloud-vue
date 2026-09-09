# manifest-detail-lifecycle-actions Delta: write-feedback-toast-and-undo

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [write-feedback-toast-and-undo](../../)

## Purpose

A lifecycle transition asks before a destructive step, reports afterwards and
offers a way back. Competitor row B16 and placement rows A06 and A21 of the
dossiq round 2 analysis.

## ADDED Requirements

### Requirement: REQ-MDLA-6 A transition confirms, reports and offers undo

`CnLifecycleActions` SHALL open a confirm dialog before a transition with
`variant: danger`, a transition into a final state, or a transition with
`confirm: true`; `confirm: false` SHALL skip it. After a successful POST it
SHALL show a success toast naming the object and the new state. When the
transition graph declares a reverse transition from the new state to the old
one, the toast SHALL carry an Undo that posts it within 10 s. `feedback:
false` on the `lifecycleActions` config SHALL suppress the toast only.

#### Scenario: Close asks first

- **GIVEN** a transition "Close" into a final state
- **WHEN** the user clicks it
- **THEN** a confirm dialog opens and Cancel sends no request

#### Scenario: Pick up reports and undoes

- **GIVEN** a transition "Pick up" from open to assigned, and a declared reverse "Release" from assigned to open
- **WHEN** the POST succeeds
- **THEN** a toast reads "Moved {title} to Assigned" with Undo, and Undo posts "Release"

#### Scenario: No reverse edge, no Undo

- **GIVEN** a transition whose target state declares no transition back
- **WHEN** the POST succeeds
- **THEN** the toast renders without an Undo button

@e2e include On a detail page with lifecycle actions, click a final-state transition; assert the confirm; cancel; assert no request; click a transition with a reverse edge; assert the Undo and the reverse POST.
