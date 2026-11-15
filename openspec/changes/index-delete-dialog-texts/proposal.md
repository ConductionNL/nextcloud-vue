# An index page can word its delete dialog

## Why
opencatalogi's publication delete should say what it removes: the publication and its attachments leave the public
page and the Woo sitemap. CnDeleteDialog had a title and a question, no line for the consequence, and a manifest index
page could not set any of them (opencatalogi `publication-delete-says-what-it-removes` T01).

## What changes
- `CnDeleteDialog` takes `description`: a muted line under the question, `{name}` filled, nothing when empty.
- `CnIndexPage` takes `deleteDialog: { title?, message?, description? }` (manifest `config.deleteDialog`), translated and
  handed to the single-item delete dialog; unset keys keep the defaults.
