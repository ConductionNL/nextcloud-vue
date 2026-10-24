# A reply can be saved as a draft

## Why

DqZaakContact draws "Opslaan als concept" beside "Versturen" under the reply
to the resident. The coordinator decided to build it (24 Oct): a handler who
starts an answer and is interrupted keeps it, on this case, across a reload
or another device.

## What changes

CnConversationWidget `content.draft: { url }`: on load the widget reads the
saved draft (`GET url` answers `{ text }`) into the reply box; "Save as draft"
beside Send stores the box (`PUT url` with `{ text }`) and says when it was
saved, or that it could not be. A reply that goes out through the widget's
own endpoint clears the draft. `@objectId` in the url is the record. The app
owns the endpoint and who may read it.
