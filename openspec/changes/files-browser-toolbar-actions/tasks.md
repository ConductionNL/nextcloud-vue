# Tasks: files-browser-toolbar-actions

### Task 1: The host chooses whether the bar has a New menu
- **spec_ref**: `openspec/changes/files-browser-toolbar-actions/specs/files-browser/spec.md#requirement-the-host-chooses-whether-the-bar-has-a-new-menu`
- **files**: `src/components/CnFilesBrowser/CnFilesBrowser.vue`, `src/components/CnObjectSidebar/CnFilesTab.vue`, `docs/components/cn-files-browser.md`
- [x] Implement: `newMenu` on the browser, forwarded by the files tab
- [x] Test: `tests/components/CnFilesBrowserNewMenu.spec.js`

### Task 2: The host can put New folder in the bar as a button
- **spec_ref**: `openspec/changes/files-browser-toolbar-actions/specs/files-browser/spec.md#requirement-the-host-can-put-new-folder-in-the-bar-as-a-button`
- **files**: `src/components/CnFilesBrowser/CnFilesBrowser.vue`, `src/components/CnObjectSidebar/CnFilesTab.vue`, `docs/components/cn-files-browser.md`
- [x] Implement: `folderButton`, forwarded by the files tab
- [x] Test: `tests/components/CnFilesBrowserNewMenu.spec.js`
