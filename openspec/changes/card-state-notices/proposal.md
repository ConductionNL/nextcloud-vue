---
kind: code
---

# Proposal: card-state-notices

## Summary

The dossiq boards redrawn on 3 Nov draw a state banner inside the card or dialog where something just happened: an engine refusal on a task (DqZaakTaken "Annuleren geweigerd ..."), a success that keeps you on the case ("Taak afgerond. U blijft op de zaak"), a partial bulk result with a button (DqZaken "2 zaken naar In behandeling verplaatst. ... Mislukte acties bekijken"), a source that is down (DqTeamwachtrij "Bron niet beschikbaar: taken uit pipelinq."), a link refused (DqZaakGerelateerd), a save refused in a dialog (DqBerichtVersturen, DqZaakLocatie). Eighteen measured boards draw one (rollup R1). The library shows these answers as a toast, which leaves the card and disappears, and has no way for a manifest to put a banner in a card.

This change makes the `notice` content the one banner shape (role status or alert, inline or stacked, buttons, close), gives every card, table, dialog and index page a `notices` list with a `#notice` slot, lets a detail widget declare `notices` in the manifest, and lets an action's answer land in the card it ran from.

## Scope

- CnNoticeWidget: `content.role`, `content.layout`, `content.actions`, `content.dismissible`, `{path}` placeholders, prop `inline`.
- New CnCardNotices (exported) and `src/utils/cardNotices.js` (`WIDGET_NOTICES`, `PAGE_NOTICE_CHANNEL`, `normalizeNotice`, `noticeFromOutcome`).
- `notices` prop + `#notice` slot on CnWidgetWrapper, CnDetailCard, CnDataTable, CnDialog (with `noticesPlacement`), and CnIndexPage (`config.notices`).
- CnDetailWidgetHost: widget `notices`, a card-scoped `cnDispatchAction` that passes `showNotice`, the `cn:page:notice` channel by widget id.
- actionsDispatcher: api-call, agent and run-node answers go through one `reportOutcome`, which draws a notice when the answer carries `notice` or the action sets `noticeInline`, else toasts as before.
- Board look tones and inset in look-board-detail.css.

## Out of scope

- The server envelope itself (dossiq SIG returns `notice` on refusals; contract in R20/DQ-BUILD-CONTRACTS.md A1).
- Dashboard widget cards (CnDashboardPage) and tab panels in bare mode: they keep the toast until a board asks.
- No schema change: detail widget definitions and `notice` content stay open objects.
