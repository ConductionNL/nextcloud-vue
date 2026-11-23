# Proposal: header-field-pill

## Why

DqTenant's header line reads "Actief · Instellingen / Organisaties / Gemeente Waterland", then the organisation's slug
"waterland" in a soft pill (21px, 13px/600, grey ground, no edge), then "een van 6 organisaties op deze omgeving". The
header field formats offered a framed chip or bold text (`strong`), neither of them that pill.

## What changes

A detail page's `headerFields` entry takes `format: "pill"`: the value in a 21px pill on the dark ground, 10px in, at
13px/600, without an edge. The manifest schema accepts it (2.166.0).

## Scope

CnDetailHeaderChips, headerFieldChips, app-manifest-v2 schema.
