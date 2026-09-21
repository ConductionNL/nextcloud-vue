---
title: CnDateAxisView
---

# CnDateAxisView

The index page's rows on a time scale. Offered as the `dateAxis` view mode when
the page declares `config.dateAxis` and lists `dateAxis` in `viewModes`.

## It hides nothing

That is the requirement and the reason the view exists: a planner opens it to
find the week where three things land on one person. Two overlapping bars get
their own track, so the lane grows taller rather than losing a bar. A layout
that stacked them, or dropped the second, would answer "looks fine" to the one
question being asked.

Rows with no usable dates — no start, no end, an unparseable value, or an end
before the start — go to a visible **Unplanned** lane. Work with no dates is
exactly what a planner is looking for, and a time scale has nowhere to put it,
so it is a lane rather than a row that never renders.

## It reschedules nothing

The only gesture is opening a row. A date-axis view that moved a bar on drag
would be changing statutory dates from a picture, and the window is the
reader's choice rather than something the view writes back.

## Every bar has an accessible name

A bar positioned by percentage says nothing at all to a reader who cannot see
it, so each one is a `<button>` carrying the row's name and both dates in
words. `title` alone would not do: it is not read reliably and it cannot be
reached by keyboard.

A single bar, or several that start and end together, takes the whole lane
rather than dividing by a zero-width window. A zero-length bar keeps a minimum
width, because a one-day term is real and a bar of no width is invisible.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `rows` | `Array` | `[]` | The rows the list holds. |
| `startField` | `String` | `''` | Where a row's start is. |
| `endField` | `String` | `''` | Where a row's end is. |
| `laneField` | `String` | `''` | What to put in a lane together. Omitted, everything shares one lane. |
| `labelField` | `String` | `''` | The field a bar is named by, on screen and in its accessible name. |
| `rowKey` | `String` | `'id'` | The row key. |

## Events

| Event | Payload | Description |
|---|---|---|
| `row-click` | row | A bar or an unplanned row was opened. |

## See also

- `utils/dateAxisLanes.js` — the layout, the tracks and the window.
- `CnIndexPage` — `config.dateAxis` and `viewModes` wire the mode.
