# The ai-chat widget stands in a titled card

## Why

Board DqZaakAssistent draws the assistant beside the AI oversight tab as a card titled "Assistent" with a "Hermiq" pill, a line saying what the assistant sees, and an input "Vraag iets over deze zaak" with a "Vragen" button. Live, the `ai-chat` widget rendered bare: the companion's own titlebar named the agent ("Hydra Triage") with settings and history icons, there was no card title, and the input had an icon send button (COMPDIFF DqZaakAssistent, 23 Oct).

## What changes

- `ai-chat` is a content-only type: the detail host draws its titled card.
- In that card the panel has no titlebar (`titled`). Its controls (new chat, all conversations / back to the chat, read aloud, other agents) become items of the card's Actions menu through the widget's `header` event, so no feature is lost.
- Content keys `pill` / `pillVariant` (title-row pill), `note` (a line above the input), `placeholder` and `sendLabel` (labelled send button).

## Impact

CnAiChatWidget, CnAiCompanion, CnAiChatPanel, CnAiInput, widgetDispatch. Opt-in keys; the floating companion is unchanged. No schema change (widget content is open). l10n en+nl for five menu labels.
