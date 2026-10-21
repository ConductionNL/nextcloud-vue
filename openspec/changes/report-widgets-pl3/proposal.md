---
kind: code
---

# Proposal: report-widgets-pl3

## Summary

pipelinq's report and marketing pages move onto chart, stat, table, markdown and image widgets. Four small gaps kept
their custom components:

- a table row's action could not post to the endpoint of that row (Run now on a competitor watch) or hand a modal the
  row's values (Override on a forecast owner);
- a table on an endpoint did not sort when a header was clicked, so an agent leaderboard or a list of search queries
  lost its sorting;
- a stat tile's second line could not carry figures from the answer ("Not delivered: 5 held back, 1 failed");
- the markdown and image widgets showed only fixed content, not a field of the detail page's record (an article's body
  and hero image).

## Scope

- `CnWidgetObjectTable`: `@row.<field>` tokens in a row action's url, filename, target, payload, params and props
  (`src/utils/rowTokens.js`); header sorting of endpoint rows.
- `CnStatWidget`: `{path}` placeholders in `content.note`, filled like the caption's.
- `CnMarkdownWidget`, `CnImageWidget`: `content.field` (and `altField`), with a Files path shown through the preview.
- Docs of each. No manifest schema change: widget `content` is not validated field by field.
