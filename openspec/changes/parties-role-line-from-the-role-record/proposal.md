# A party row reads its words from the field meant for it

## Why
DqZaakBetrokkenen draws two cards over the same parties. "Partijen" (the contacts integration) prints a details line per person: "Contact · Lindelaan 14 · ingelogd met DigiD", "Organisatie · KvK 00001005 · contactpersoon J. van Wijk", "Collega · Mobiliteit en verkeer · lars.dekoning@zuiddrecht.example". "Rollen" (the parties widget) prints a role line: "Primaire partij · verzoeker", "Gemachtigde namens Aannemersbedrijf Van Wijk B.V. · Awb 2:1", "Belanghebbende · KvK 00001005", "Adviseur · Mobiliteit en verkeer".

Both cards read the party link's one `note`, so Rollen printed the Partijen words. The role record already carries a `description` of the role assignment. Partijen also had no word for the person's kind, although every party link carries its `partyKind` (`person`, `organisation`, `colleague`) and every link its `kind` (`party`, `user`, `contact`).

## What changes
- Parties widget, `content.note` (`{ "from": "roles", "field": "description" }`): a board row prints that field of the party's role row (`rolesObjects`, matched on `participant`) instead of the link's note, and no note when the party has no role row. Without it the link's note stays.
- Board meta line: a note that starts in lower case continues the role ("Gemachtigde namens …", "Melder zonder account · …"), a note in upper case follows it after a middot ("Belanghebbende · KvK …").
- Contacts tab, `kindLabels` (keyed by `partyKind`, else `kind`): the board row's details start with that word. No word, nothing leads.
- Detail widget host: a `labels` entry may be a map of words; each word is translated in the host's language and the keys kept, so `labels.kindLabels` reaches the leaf in the app's language.
