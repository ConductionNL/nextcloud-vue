# A list can read its rows from an app endpoint

## Why

DqZaakAssistent's "Wat de assistent op deze zaak deed" lists hermiq's advisory records about the case. hermiq serves them only through its subject route (it first asks whether the reader may open the case), so the list has no register/schema. CnObjectListWidget read rows only from OpenRegister, so the card always showed its empty state, and its Download (`content.export`) only knew OpenRegister's export.

## What changes

- `content.endpointSource` (`{ url, params?, responsePath? }`): rows from an app endpoint for a list without register/schema; rows at `responsePath` (default `results`), the count at `total`; a refusal shows the server's message.
- `content.export.url` (+ `params`): the Download button opens that app endpoint, tokens resolved against the record; `group` keeps working.

## Impact

CnObjectListWidget only, opt-in. No schema change (widget content is open).
