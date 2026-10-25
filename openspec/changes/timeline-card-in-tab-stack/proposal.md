# The timeline stands in a card in a tab stack

## Why
Board DqZaakHistorie draws the case history and "Notitie toevoegen" as two cards under the tab. Live (r25b, 24 Oct) drew both
bare on the page ground: the `timeline` widget owns its title row but did not ask the host for the card, so a tab stack
gave it no border and no background. The note form card (`composer: "only"`) also lost its title, because it relied on a
host title that a self-titled widget does not get.

## What changes
- The `timeline` registry entry asks for `chrome: "card"`, so on a card surface it stands in an untitled card, as
  `retention` does. A body grid cell and bare chrome keep it bare.
- In `composer: "only"` the manage view draws its own title row: `content.title` (default "Add note") and
  `content.subtitle` (default "Goes on the timeline above, internal unless you make it visible").

No schema change.
