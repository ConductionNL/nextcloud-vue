# Proposal: folder-heading-parts

## Why

DqAfdelingen heads the list of a selected team with "Vergunningen" and under it "Fysiek domein · 18 medewerkers ·
teamleider Lars de Koning". The groups pane already writes the parent and the count; the team lead lives on the record
the tree is read from (`parentsFrom`), and nothing could put it in the line.

## What changes

- A group read through `parentsFrom` keeps its record.
- `folderSidebar.headingParts: [{ field, text, format? }]` adds a part per field that record carries: `text` with
  `{value}`, translated; `format: "user"` names a user id by its display name. An empty field adds nothing.

## Scope

CnIndexPage (`groupParentsFromRecords`, `loadFolderGroups`, `scopeHeading`). No schema change.
