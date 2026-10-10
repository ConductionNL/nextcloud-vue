---
kind: code
---

# Proposal: dutch-library-strings-and-files-crumb

## Summary

On the review instance of 10 October 2026 (finding N4) a Dutch reader met
library strings in English: the quick filter chip's "14 more filters",
"(optional)" in form dialogs, and the files browser's New, Size and Modified.
On a case's Documents tab the root crumb read the folder's uuid, and the
primary button was cut to "Bestanden...".

## What changes

1. Dutch translations for every string of `CnFilesBrowser`, `CnFilesTab`,
   `CnQuickFilterBar`, `CnFormField` and `CnFormDialog` that had none (44
   strings and one plural). The quick filter chip's count becomes a plural
   (`{count} more filter` / `{count} more filters`), so one hidden filter no
   longer reads "1 more filters" (Dutch "Nog 1 filter").
2. `CnFilesTab` names the files browser's root crumb after the object: the
   host's `browserRootLabel`, else the object's name (`@self.name`, else
   `title`, else `name`, never its uuid), else the folder's own name. The name
   comes from the object read `resolveObjectFolder` already makes, through a
   new `resolveObjectFolderInfo` in the same module; `resolveObjectFolder`
   keeps its signature and result.
3. The files browser bar lets the crumbs give way and keeps its controls at
   their width, so a button label is never cut beside a long crumb.
