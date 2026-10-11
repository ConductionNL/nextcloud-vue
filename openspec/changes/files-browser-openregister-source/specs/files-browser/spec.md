## ADDED Requirements

### Requirement: The files browser can read an OpenRegister object's folder through OpenRegister

CnFilesBrowser SHALL accept a `source` prop. Without it the browser SHALL behave as before, over WebDAV. With a source from `createOpenRegisterSource({ apiBase, register, schema, objectId })` it SHALL list, create folders, upload, rename and delete through OpenRegister's object folder endpoints and download through the object's file endpoint, and SHALL send no WebDAV request. It SHALL NOT offer the Files app's registered actions or New menu entries. It SHALL offer upload, the New menu, the upload button, the drop state, the drop hint, rename and delete only when the listing says the person may change the folder.

#### Scenario: A reader browses a case folder and its subfolder
- **GIVEN** a source on a case the person may read but not update
- **WHEN** the browser lists the folder and the person opens subfolder `Bijlagen`
- **THEN** the rows SHALL be the case folder's files and folders, then the subfolder's files, and the crumbs SHALL read the case title then `Bijlagen`
- **AND** no upload, New menu, drop state, rename or delete SHALL be offered
- @e2e e2e/files-browser-openregister.e2e.js

#### Scenario: A person who may update the case changes the folder
- **GIVEN** a source on a case the person may update
- **WHEN** they create a folder, upload a file, rename a file and delete a file
- **THEN** each SHALL go through the source, and the browser SHALL re-list the folder after each
- @e2e e2e/files-browser-openregister.e2e.js

#### Scenario: A person the case refuses sees no files
- **GIVEN** a source on a case the person may not read
- **WHEN** the browser lists the folder
- **THEN** it SHALL show no rows and say the files cannot be seen
- @e2e e2e/files-browser-openregister.e2e.js

### Requirement: The files tab reads an object's folder through OpenRegister by default

CnFilesTab SHALL accept `source`, `openregister` (default) or `webdav`. With `openregister` it SHALL give the browser a source for its object, root `/`, and the object's title on the root crumb unless `browserRootLabel` is set. When the folder cannot be listed it SHALL show its attachments list. With `webdav` it SHALL resolve the folder over WebDAV as before.

#### Scenario: The tab on a readable case
- **GIVEN** a files tab on a case the person may read
- **WHEN** it opens
- **THEN** it SHALL show the files browser on the case folder with the case title on the root crumb
- @e2e e2e/files-browser-openregister.e2e.js

#### Scenario: The tab asked for WebDAV
- **GIVEN** a files tab with `source: 'webdav'`
- **WHEN** it opens
- **THEN** it SHALL not call the object folder endpoint
- @e2e exclude {WebDAV needs a Nextcloud session the harness does not have; covered by tests/components/CnFilesBrowserOpenRegisterSource.spec.js}
