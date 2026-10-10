# Tasks: files-browser-openregister-source

- [x] 1. `createOpenRegisterSource()` in `src/components/CnFilesBrowser/openRegisterSource.js`, exported.
- [x] 2. CnFilesBrowser `source` prop: list, create folder, upload, rename and delete through it; no WebDAV actions; changes offered only with `canChange`.
- [x] 3. CnFilesTab `source` prop, default `openregister`, object title on the root crumb, legacy list when the folder cannot be listed.
- [x] 4. Jest tests: `tests/components/CnFilesBrowserOpenRegisterSource.spec.js`.
- [x] 5. Browser e2e in the harness: `e2e/files-browser-openregister.e2e.js` (mocked by default, live against an instance with `LIVE_OR_URL`).
- [x] 6. Docs: `docs/components/cn-files-browser.md`, `docs/components/cn-object-sidebar.md`, `docs/utilities/create-open-register-source.md`.
