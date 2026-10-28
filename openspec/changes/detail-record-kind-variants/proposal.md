# Detail page variants per kind of record

## Why

pipelinq's ticket page serves requests and contact moments. Board PqContactmoment gives a contact moment the Contactmomenten breadcrumb and its own "Wat nu?" steps; the page could only declare one of each.

## What changes

- A breadcrumb crumb takes `visibleWhen`, read off the record like a widget's.
- `nextStep.variants: [{ when, title?, stages }]`: the first whose `when` holds replaces the declared title and stages.
