---
kind: code
---

# Proposal: screens-dashboard-greeting-header

## Summary

DqMijnWerk (and DqMijnTeam, PtDashboard) open with the page name as h1 and,
under it, a 15px grey line that greets the reader: "Goedemiddag, Pieter ·
maandag 5 oktober 2026" (PtDashboard adds " · website en Mijn Zuiddrecht").
On DqMijnWerk the header carries only the buildiq square and "Nieuwe zaak";
under it sits a row with the view switch (Mijn werk / Mijn team) left and
three small link pills right ("Uw wachtrij", "Aan mij toegewezen", "Dag
afsluiten": 34px high, radius 17, 13px/600, primary light on primary deep).

Live (round6 dossiq library gap 9) dossiq draws a greeting header widget with
its own large heading, the view switch among the header actions, the
dashboard edit toggle and Actions menu in the header, and the links as
outlined buttons. CnDashboardPage has no way to put the greeting in its own
subtitle, no switch row, and no way to drop the page Actions menu.

This change adds three opt-in page keys and one board rule:

1. `config.greeting` (`true`, `"first"`, `"full"`): the subtitle reads the
   greeting, today's date written out, then the description, joined by " · ".
2. `config.viewLinks`: small pills on a switch row under the header.
3. `config.showActionsMenu: false`: no page Actions menu in the header.
4. Board look: the page view switch sits on that switch row, left, rather
   than among the header actions.

The edit toggle already follows `allowEdit`.

## Reference screens

- `dossiq/DqMijnWerk`: https://identity.conduction.nl/screens/board?id=dossiq/DqMijnWerk
- `dossiq/DqMijnTeam`, `portaliq/PtDashboard` (greeting, date, description)

## Affected consumers

dossiq (MyWorkHome), portaliq (Dashboard). The view-switch move applies to
every board-look dashboard with `views` (today: dossiq only).

## Backward compatibility

Additive. Without the keys and without the board look the header renders
as before. Manifest schema 2.75.0.
