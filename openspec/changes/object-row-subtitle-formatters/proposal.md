# Proposal: object-row-subtitle-formatters

## Why

The team queue (DqTeamwachtrij) is a list view whose second line the board writes as "2026-0076 · Dagblad
Drechtsteden · Ontvangen · prioriteit hoog": the status by its name and the priority as a word. A list row's
`subtitleTemplate` reads raw values only, so live prints the priority's stored value ("normal", English on a Dutch
instance) and cannot name the status at all (it is a reference).

## What changes

A `subtitleTemplate` token may name a formatter: `{field|formatter}` reads the value through the host's formatter of
that name (`cnFormatters`, the same registry a column's `formatter` uses), with the row as its second argument. A
formatter that answers '' drops the part and its separator, as an empty field does. An unknown formatter leaves the raw
value. A token without a formatter is unchanged. No schema change.
