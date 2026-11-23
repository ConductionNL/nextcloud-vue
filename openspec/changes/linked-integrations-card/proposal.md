# linked-integrations-card

## Why

The boards draw what other apps hold for a record in one side card, not as a widget per app: DqZaak's "Gekoppeld" lists
the linked dossier and question, then one line "Leges en betalingen, contract en projecten: niets gekoppeld" with the
links "Nieuw project" and "Openen in planninq". The library had no such card, so dossiq placed planninq's projects leaf as
its own undesigned widget.

## What changes

- A `linked` widget type (CnLinkedWidget, content-only, so the page draws its titled card) with `content.leaves`, the
  integration ids in order.
- Each mount-mode leaf is mounted out of sight with an `onSummary(summary)` prop and reports
  `{ count, noun, rows?, actions? }`.
- Leaves with something linked draw their rows (`{ label, href?, run?, icon? }`, else "noun (count)"). The others share one
  line "<nouns>: nothing linked" (nl "niets gekoppeld"), followed by their actions.
- An absent app's leaf is not registered and is left out; a leaf that has not reported draws nothing yet.
