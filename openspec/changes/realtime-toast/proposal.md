---
kind: code
---

# Proposal: realtime-toast

## Summary

Board DqWerkbord draws a dark toast at the bottom of the board: "Zojuist bijgewerkt door Anouk Bakker. Openbare verlichting fietspad Lindelaan staat nu op Besluit. Het bord en de zaakpagina volgen de zaak live; herladen hoeft niet." with a close button. CnRealtimeToast shows a change someone else made to what the page shows and asks the page to read again. The index page takes it as `config.realtime`.

## Scope

- New `src/components/CnRealtimeToast/` (exported).
- CnIndexPage prop `realtime` (`{ url, interval?, views?, titleTemplate? }`): the toast while the page is in one of `views` (all when unset); a change reads the list again.
- Library strings (en + nl), docs page.

## Out of scope

- The change feed (dossiq SIG: `GET .../changes?since=<iso>` answering `{ changes, now }`), or an app's own push on an event-bus channel.
