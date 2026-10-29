# Proposal: board-tonal-button

## Why

The boards draw a light-blue pill for an action on a card: "Herinnering versturen" (PqAfspraak), "Exporteren als CSV"
(PqForecast), "Kanaal toevoegen" (PqContactpersoon), "Nieuwe rol" (PqBeheerKassa) and others. It is 34px high, 12px in,
without a border, with a 17px radius, the primary tint and its ink at 13/600. Only a record list's footer action and a
widget header action could draw it, each with its own copy of the style, so apps drew these actions as neutral
secondary buttons.

A side card whose widget draws its own heading, such as the timeline's "Geschiedenis", showed Nextcloud's 16.5px h3 in
the main ink where every other side card title is a 15px muted label.

## What changes

- One class, `cn-button--tonal`, draws the tonal pill on any NcButton, or on an NcActions menu named as a button. In the
  board look it outweighs the neutral secondary and tertiary looks.
- An action entry with `variant: "tonal"` is a tertiary button carrying that class.
- A record list's tonal footer action carries the class too.
- In a board-look side card, the timeline's own title and any heading with `cn-side-heading` read as the side card
  title.

No schema change.
