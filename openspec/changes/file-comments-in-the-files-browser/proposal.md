---
kind: code
---

# Proposal: file-comments-in-the-files-browser

## Summary

Let `CnFilesBrowser` show and write the comments Nextcloud already stores
against a file. Today a file on a case page has a menu, a preview and no
place to say anything about it.

Opened from the dossiq competitor gap scan of 2026-09-18, pack b, row 4.18
"Notes or annotations on a document". Rated no on dossiq, owner
nextcloud-vue, size S.

## Motivation

Nextcloud stores per-file comments and serves them over DAV at
`/remote.php/dav/comments/files/{fileId}`. The Comments app's only surface
is the Files details sidebar, and that sidebar is a store bound to the
Files app's own router on Nextcloud 34, so it cannot be mounted anywhere
else. `CnFilesBrowser` names `details` and `sidebar` in
`ACTIONS_NEEDING_THE_FILES_PAGE` for exactly that reason and offers Show in
Files instead.

That fallback is right for a share dialog, which is a full surface. It is
wrong for a comment, which is one sentence somebody wants to leave while
looking at the row. Leaving the app to write it means nobody writes it.

Three consumers are waiting rather than one, which is why this belongs
here and not in a host app. dossiq's `case-panels` note still claims the
Files tab keeps "the files leaf's share and comment surface"; it does not,
and no host can add one without reimplementing the DAV client. filinq
annotates documents for a living. Every host of the `files` leaf has the
same row and the same missing sentence.

The best competitor in the register: OpenCase, per-document notes on the
document row; zaaksysteem, labels and notes on a document.

## Affected projects

- `nextcloud-vue`: `CnFilesBrowser`, a new `CnFileComments` panel, the
  `files` integration widget config in the manifest v2 schema.
- Consumers: dossiq (the case Files tab, row 4.18), filinq, every host of
  the `files` leaf.

## Backward compatibility

Comments are off unless the host asks for them. A browser with no
`comments` prop renders exactly what it renders today, and the manifest v2
validator accepts the new optional key while rejecting nothing it accepted
before. An instance whose Comments app is disabled does not show the
action, rather than showing one that fails on click.
