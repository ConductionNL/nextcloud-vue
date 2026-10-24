## ADDED Requirements

### Requirement: a reply can be saved as a draft and comes back

With `content.draft.url` the conversation widget MUST read the saved draft into the reply box when it loads, MUST offer "Save as draft" beside Send that stores the box's text with a PUT, and MUST say when it was saved or that it could not be. A reply sent through the widget's endpoint MUST clear the draft. Without `content.draft` nothing changes.

#### Scenario: DqZaakContact
- GIVEN a handler typed "De stukken zijn verzameld." and pressed "Opslaan als concept"
- WHEN the case page is opened again
- THEN the reply box holds "De stukken zijn verzameld."
