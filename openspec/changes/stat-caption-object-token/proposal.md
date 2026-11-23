# Proposal: stat-caption-object-token

Board PqEvenement's first tile reads "Aangemeld 64 / van 80 plaatsen". The tile counts registrations from a register, and its caption named `{capacity}`, a field of the event, not of a count payload, so live drew "van plaatsen". A caption now fills `@object.<field>` (and the other page tokens a source already takes) from the page's contexts. No schema change.
