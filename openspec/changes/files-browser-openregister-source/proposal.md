# Proposal: files-browser-openregister-source

The nextcloud-vue half of openregister's `object-folder-in-files-browser`
(ConductionNL/openregister, option 1, decided by Ruben on 2026-10-10:
the files browser reaches an object's files through OpenRegister's files API
instead of WebDAV, and object folders keep subfolders).

## Why

OpenRegister keeps every object folder in its own `openregister` account, out
of each person's Files app, and decides file access from the object. CnFilesBrowser
reads over WebDAV under `/files/<uid>`, so `resolveObjectFolder()` finds no folder
for a reader and CnFilesTab falls back to the old attachments list. Found live:
`bea`, who may read a case, saw no files browser on it.

## What changes

- `createOpenRegisterSource({ apiBase, register, schema, objectId })`: a data
  source over OpenRegister's `/api/objects/<register>/<schema>/<id>/folder`
  endpoints (list, create folder, upload, rename, delete) and the object's
  `files/<fileId>` download and preview endpoints.
- CnFilesBrowser takes a `source`. Without one it behaves exactly as before
  (WebDAV, the Files app's actions and New menu). With one it lists and writes
  through the source, offers download, rename and delete itself, does not offer
  the Files app's WebDAV actions, and offers upload, new folder, rename, delete
  and the drop state only when the listing says the person may change the
  folder.
- CnFilesTab gets `source: 'openregister' | 'webdav'`, default `openregister`.
  The root crumb reads the object's title. A folder that cannot be listed (no
  read, or an OpenRegister without the endpoints) keeps the attachments list.

## Impact

Minor version. A host on an OpenRegister without the folder endpoints sees the
attachments list it would have seen for a reader before; `source: 'webdav'`
restores the WebDAV browser.
