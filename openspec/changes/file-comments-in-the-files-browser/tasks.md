# Tasks: file-comments-in-the-files-browser

Kind: code. Row 4.18 of the dossiq gap scan.

## 1. The DAV client

- [ ] 1.1 `src/components/CnFilesBrowser/fileComments.js`: read, post and
  delete a comment over `/remote.php/dav/comments/files/{fileId}`, as pure
  functions over an injected client, so every rule below is unit testable
  with no server.
  - `@spec openspec/changes/file-comments-in-the-files-browser/specs/files-browser/spec.md`
  - unit: a REPORT returns the comments newest first; a POST returns the
    stored comment; a delete of somebody else's comment is refused by the
    server and the refusal is surfaced, not swallowed
- [ ] 1.2 Availability is asked, never assumed. An instance with the
  Comments app disabled answers 404 or 405 on that path; treat that as
  "no comments here" once per browser, not once per row.
  - unit: a 404 on the first read hides the action and logs nothing further

## 2. The panel

- [ ] 2.1 `src/components/CnFilesBrowser/CnFileComments.vue`: the comments
  on one file, newest first, each with its author, its moment and its text,
  and a box to add one. Author and moment come from the server, never from
  the browser's clock.
- [ ] 2.2 A row action Comments opens it, carrying the node. The action is
  built in rather than host declared, because a host that had to declare it
  would be declaring the platform's own capability.
- [ ] 2.3 The row shows that a file has comments, so somebody looking at
  the folder knows where to look. A count, not a dot: one comment and
  eleven are different amounts of reading.
- [ ] 2.4 A failed read draws an error with a retry. A file with no
  comments and a comments service that is unreachable must not render the
  same, because only one of them means somebody's note is invisible.

## 3. The host's side

- [ ] 3.1 `comments` prop on `CnFilesBrowser`: absent or false renders
  today's browser exactly. Default false, so no existing host changes
  behaviour on upgrade.
- [ ] 3.2 The manifest v2 `files` widget config accepts `comments`, and the
  validator rejects nothing it accepted before.
- [ ] 3.3 `CnFilesTab` forwards it, the way it forwards `rowActions` and
  `newActions`.

## 4. Verification

- [ ] 4.1 `tests/components/CnFileComments.spec.js` and
  `tests/components/CnFilesBrowserComments.spec.js`.
- [ ] 4.2 Mutation check: make an unreachable comments service render the
  empty state, and assert the "a failed read is not an empty one" test
  reddens on its own assertion rather than on a setup line.
- [ ] 4.3 `docs/components/_generated/CnFilesBrowser.md` regenerates with
  the new prop.
- [ ] 4.4 `openspec validate file-comments-in-the-files-browser --strict`.
