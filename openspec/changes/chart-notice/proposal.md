# Proposal: chart-notice

## Why

Board DqHandhaving draws an info notice inside the LHS matrix card: "**Advies: last onder dwangsom**, ... Uitkomst van
de beslistabel ... met gedrag 2 en gevolg C." Its words carry values from the advice record. A chart could only carry a
static muted `footnote`, and a detail page resolves only whole-value `@object` tokens, so the sentence could not be said.

## What changes

CnChartWidget takes `notice: { lead?, text?, values?, labels?, tone? }`, drawn as an NcNoteCard under the chart:
- `lead` (bold) and `text` go through the host translate; `{name}` is then filled from `values[name]`.
- `values` are literals or tokens resolved with the chart's own token context (`@object.<field>`, `@objectId`,
  `@workspace`, `@config`), the resolver the chart already uses for `highlight` and `cellSource.filter`.
- `labels[name]` turns a stored key into words: `"rows"`, `"columns"`, `"values"` read the matrix's cellSource label
  maps (so the notice and the matrix say the same words), or an object map; labels are translated.
- `tone`: info (default), success, warning, error; the note card draws the tone's icon.
- While any value is missing the notice is not drawn, so half a sentence never shows.

Chart props stay free-form in the manifest schema, so no schema change.
