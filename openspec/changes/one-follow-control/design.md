# Design: one-follow-control

## D-1: one control, two buttons

The Follow toggle stays a labelled button, because following is the primary act and a text label is what the boards draw beside a record's title. The notifications switch is an icon-only button next to it with `aria-pressed` and an `aria-label` that says what a click does ("Turn notifications off" / "Turn notifications on"). It shows only while the user follows: there is nothing to switch for a record you do not follow.

The Follow icon is an eye (follow), the switch a bell (notify) or a crossed-out bell (quiet). The bell used to be the Follow icon; moving Follow to the eye frees the bell to mean exactly one thing.

## D-2: the switch writes through the follow verb

OpenRegister puts the switch on `PUT .../watch` (`merge-follow-and-favourites` D-5), so `setWatching(register, schema, id, true, { notify })` sends a JSON body and nothing else changes. Optimistic like the toggle: flip, send, revert with the server's message on failure.

## D-3: the star column becomes a follow column

A list shows which rows you follow with a compact `CnFollowToggle` (eye only, no bell, no count, no popover). `showFavouriteColumn` renders the same column, so an app that turned the star column on keeps a column and loses only the star.

## D-4: lenses

`favourite` maps to `watching` before de-duplication, so `['favourite', 'watching']` is one Following tab and the query sends `_watching`, never `_favourite`.
