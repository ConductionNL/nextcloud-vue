# A dashboard title can follow the page's workspace

## Why
Board PqWerkplekKlant titles the werkplek "Gesprek met Sanne de Vries" while a call is on. The page's title was fixed.

## What changes
`config.titleWhen` is `[{ when, title }]`, where `when` is a workspace condition and `title` is a template with `{workspace.<key>}` tokens. The first entry whose condition holds and whose tokens all fill replaces the title. Otherwise the page keeps its own title.
