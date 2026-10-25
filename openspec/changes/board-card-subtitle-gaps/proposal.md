# A board card's subtitle and the gap under it

## Why
The Dq boards draw a body card's subtitle 14px muted, 3px under the title, with the content starting 12px under it
(55 of 61 subtitles; measured on the flattened boards: Taken op deze zaak, Gerelateerde zaken, Deelzaken, Objecten).
Live drew it 13px, 2px under the title, with the content 9.75px under it. Every subtitled card's body therefore started
3-7px high (r25b, the TOOL lane's small-spacing list: Gerelateerde zaken -3.4, Incidenten -3.3, Deelzaken and Objecten
-5.8, Taken op deze zaak -6.9).

## What changes
In the board look, a body card's (not a side card's) subtitle is 14px at line height 1.2, 3px under the title, and the
content's top padding is 12px when the header has a subtitle. With the CSS injected on :8080: 3 / 17 / 12, as the
boards draw them. No schema change.
