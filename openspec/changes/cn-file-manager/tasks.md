# Tasks: CnFileManager

- [x] Component + index + barrels + jsdoc-baselines (1.0).
- [x] 14 tests (dropzone, readOnly, icons, humanSize, download/delete emit, clearDeleting, file-click, upload, upload-rejected, readOnly disables drop).
- [x] Docs page.
- [x] openspec change docs.

## Follow-up

- [~] Folder navigation. [DEFERRED: separate follow-up change — needs a parent-child folder contract on the data source; not in scope for the flat-list v1.0 API.]
- [~] Inline preview slot. [DEFERRED: depends on consumer-side preview providers (image, PDF, text); deferred to a `cn-file-manager-preview` follow-up.]
- [~] Chunked / resumable uploads. [DEFERRED: requires tus.io peer + retry-state UX; tracked as a separate change since the upload contract widens significantly.]
