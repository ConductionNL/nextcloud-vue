# Proposal: facts-days-since-phrase

Board PqContactmoment's "Over dit verzoek" card says how long the request has waited and that nobody holds it: "PQ-2026-0409 · verzoek · wacht 3 dagen · niet toegewezen". A facts part could show a date but not an age, and an empty part dropped out. Three opt-in part keys: `format: "days-since"`, `phrase` (with `phraseOne` and `phraseZero`) and `empty`. No schema change.
