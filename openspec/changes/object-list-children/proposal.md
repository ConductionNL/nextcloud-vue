# Proposal: a list shows each row's child records under it

## Why

learniq's course builder is a two-level ordered tree: the modules of a course, and under each module its lessons. It was a 1,278-line page that read every module's lessons in its own request. No library list could show a second level, so the tree could not move to the course's detail page as configuration.

The same shape exists elsewhere: the sections and lines of a quote (shillinq), the phases and tasks of a project (buildiq), menu items under a menu (opencatalogi).

## What changes

- `CnObjectListWidget` gains `content.children`: a list of the same kind under each row.
  - `children.filter` links a child to its row with an `@row.<field>` token.
  - The children of every row come from one query on the list of row values (`courseId[]=a&courseId[]=b`), page by page.
  - Each row's children are a nested list fed with those rows. It reorders within its row, has its own row actions, and adds, edits and deletes. A new child is on its row and goes last.
- `CnObjectListWidget` gains a `presetRows` prop and a `rows-stale` event: the nested list shows rows it is given and asks its owner to read again.
- A filter value that is a list is sent as `field[]=` and matches any of its values.
- A row action's `target` may name its row with `@row.<field>`.
- `CnDataTable` gains a `#row-detail` slot: a full-width row under each data row.

No manifest schema change: widget `content` is free-form.
