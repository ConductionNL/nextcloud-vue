# Proposal: phone-pages

## Why

Board PqMobiel draws pipelinq on a phone: "Mijn werk", a client, and "Bezoek vastleggen" as a sheet over the client.
Measured at 390px in the e2e harness, three library pages broke: the board dialog stretched from under the header to
the bottom of the screen with the buttons in a corner, the board detail header put its title in a 320px band of white
(the `flex: 1 1 320px` basis became a height in the phone column), and a dashboard widget's "Actions" button took the
room of its card title ("Vandaag beantwo…").

## What changes

- The board dialog is a bottom sheet below 600px: full width, anchored to the bottom, as tall as its content, a 16px
  top radius, a grab bar, the footer buttons sharing the row at 44px.
- The board detail header's first row takes its own height below 768px.
- A board dashboard widget's Actions menu shows its icon only below 640px (44px square), its name kept for assistive tech.

Wider screens are unchanged.
