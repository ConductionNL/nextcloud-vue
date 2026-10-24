# A stage's primary action can follow the open tab

## Why

COMPDIFF r25b DqZaakAssistent (24 Oct): on the AI oversight tab the "what now" card stands aside (`nextStep.notTabs`), and the page then draws the stage's primary action as a header button ("Volgende stap"), five header buttons where the board draws four. Quick actions and the card already follow the tab; the stage action did not.

## What changes

- An inline `primaryActionByStage` entry with `tabs`/`notTabs` shows its header button only beside those tabs. It stays in the Actions menu.

## Impact

CnDetailPage only, opt-in. No schema change (`headerAction` is open).
