# The side panel subtitle can count the list

## Why

DqFilterBeheren draws "48 zaken, 8 op deze pagina" under the side panel title. Live showed the schema description, which is English on a Dutch page ("A case instance in the case management system...").

## What changes

- CnIndexSidebar takes a `subtitle` prop, which wins over the schema description.
- CnIndexPage fills it from the page's `sidebar.subtitle`, a string or `{ singular, plural }` with `{total}` and `{shown}`, for both the inline and the hoisted panel.
