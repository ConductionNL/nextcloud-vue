# Proposal: appointment-create-quiet

## Why

DqTaak and DqZaakTaken draw "Afspraak maken" in the Afspraken card as an outlined secondary button with a calendar
icon. The appointment cards always made it the filled primary button with a plus, so on live it outweighed the page's
own primary action.

## What changes

Opt-in, both appointment cards:

- CnEventsCard (a task's appointments): `content.createVariant: "secondary"` reports the create action without the
  primary variant, so the host draws it as its outlined header action; `content.createIcon` names its icon.
- CnCalendarCard (the calendar leaf card): `createVariant` and `createIcon` props, the same meaning.

Without them the create button stays primary with a plus.

A flow the board leaves out of the title row stays reachable: CnEventsCard's `content.menuActions` reports it for the
card's Actions menu, and the detail widget host draws a renderer's reported `menuActions` there.
