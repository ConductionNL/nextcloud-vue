---
kind: code
---

# Proposal: board-card-role-and-keyboard

## Summary

A card on `CnBoardView` is focusable, clickable and nameless. It carries
`tabindex="0"`, an `aria-label`, `@click` and `@keydown.enter`, and no role at
all. A screen reader reaches it and can say what it is called but not what it
is, and a keyboard user who presses Space gets nothing.

Give the card a container that is honestly not a control, and give the opening
action a real button. No new prop, no new event, no new slot.

## Where this came from

Gate 32 `semantic-controls` on `src/components/CnBoardView/CnBoardView.vue:48`,
found in the quality sweep of `parity/round2` on 2026-09-18. It was the only
NEW gate finding in the repo on that branch. The sweep stopped rather than
fixing it, for two reasons that both still hold: it changes rendered output in a
library fifteen apps consume, and the one-attribute fix the gate suggests is
wrong here. This change is the argument, written down, so the markup change can
be made deliberately and tested.

`CnBoardView` arrived with `status-board-and-date-axis` (#1214) and is in no
released version, so no consumer can regress on it. That is why this is worth
doing properly now rather than patching later.

## What the markup is today

```html
<article
  class="cn-board-view__card"
  :draggable="canMove"
  tabindex="0"
  :aria-label="cardLabel(card, column)"
  @click="openCard(card)"
  @keydown.enter="openCard(card)"
  @dragstart="onDragStart(card, column, $event)">
  <span class="cn-board-view__card-field">…</span>
  <label class="cn-board-view__move">
    <select @change="onMoveTo(card, column, $event)">…</select>
  </label>
</article>
```

Four facts decide this change, and the third is the one that settles it:

1. The `<article>` is a tab stop with no role. Focus lands on something the
   assistive technology cannot name a kind for.
2. Enter opens the card. Space does not. A native control would do both, and
   Space is what most people try on something that looks like a button.
3. **The card contains a `<select>`**, the keyboard's way to do what a drag
   does.
4. Its ancestors are `role="list"` on the column container and `role="listitem"`
   on each column. The cards themselves are inside a list item, not a list.

## The two options

### Option A: put `role="button"` on the `<article>`

One attribute. The gate goes green. It is also invalid here.

An element with `role="button"` has presentational children: the accessible
name comes from the element, and what is inside it stops being exposed as its
own content. The card contains a `<select>`. An interactive control inside a
button is invalid ARIA, and the Move to control becomes unreliable, which is
the one path a keyboard user has to move a card at all.

The card's fields would also stop being readable in their own right. Everything
a handler triages by, the reference, the deadline, the assignee, collapses into
one button label.

So Option A trades a missing role for a broken control and less readable
content. The gate is a mechanical floor, and this is the case where satisfying
it mechanically makes the product worse.

### Option B: the container stays a container, and the action gets a button

The `<article>` keeps the drag and stops being a control: no `tabindex`, no
`@click`, no `@keydown`. The cards become a nested list inside the column, so
each card is a `listitem` and a reader is told how many there are.

The opening action becomes a native `<button>` inside the card, carrying the
card's accessible name. The Move to `<select>` stays its sibling, never its
descendant.

## Which one to take, and why

**Option B.** Four things it gets that Option A does not:

- Space and Enter both open the card, because a native button does that without
  being asked.
- The `<select>` is never inside a button, so the keyboard move path stays
  sound.
- The card's fields stay readable as content.
- The gate is satisfied by a native element rather than by an ARIA attribute
  that claims something the markup does not do.

It is more than one line, and that is the point. A card is not one control.

## What a card should be when it is genuinely interactive

Not a single control. A card carrying a primary action and a secondary control
is a composite, and the container should stay non-interactive whatever else
changes.

The rule to hold: **one focusable element per thing a person can do**, each a
native element, all of them siblings rather than nested. The name a card is
announced by belongs on the control that acts, not on the box that holds it,
because that is what SC 4.1.2 asks for and it is the only place a name is
reliably announced.

If a future board wants the whole card clickable for a pointer, keep the click
handler on the container for the mouse and keep the button as the only tab
stop. A pointer affordance is not a reason to make a div focusable.

## The leg that should have caught this

`check:a11y` runs 9 suites and `CnBoardView` is not one of them. There is no
`tests/a11y/CnBoardView.a11y.spec.js`, so no axe assertion has ever looked at
this component. A new component shipping without an a11y spec is how a nameless
tab stop reaches a shared library, and the gate found it only because the sweep
ran the gates by hand. This change adds that spec, which is the part that keeps
it fixed.

## Affected projects

- `nextcloud-vue`: `src/components/CnBoardView/CnBoardView.vue` and its CSS,
  plus a new `tests/a11y/CnBoardView.a11y.spec.js`.
- Consumers: none today. `CnBoardView` is unreleased. dossiq is the first
  intended consumer, on `#Cases`.

## Backward compatibility

No prop, event or slot changes. `data-testid="cn-board-card"` stays on the
`<article>` so the existing `CnBoardView.spec.js` handles keep working, and the
new button gets its own test id. The drag, the drop, the refusal and the Move
to select all behave exactly as they do now.

## Theming

No new colour. The button uses Nextcloud CSS variables and must show a visible
focus ring, which the focusable `<article>` currently leaves to the browser
default.

## Existing specs it extends

`index-page`, where `status-board-and-date-axis` put the board requirements.
That change is not archived yet, so this delta ADDS a requirement rather than
modifying one.

## Size

S. One component's markup, its CSS and two test files.

## Out of scope

- The date axis. `CnDateAxisView` already opens rows through native
  `<button>` elements, so it does not have this problem.
- The eleven inherited accessibility findings the same sweep counted, in
  `CnDataTable`, `CnFieldInspectionCard`, `CnDashboardPage` and `table.css`.
  Those belong to the debt sweep.
- Turning gate 32 on in this repo's CI. `enable-hydra-gates` defaults to false
  here and this change does not argue about that.

Next: take Option B, then add the a11y spec in the same PR so the board cannot
lose its role again.
