## ADDED Requirements

### Requirement: The files browser can show its drop state on the list and offer Add files as a button

CnFilesBrowser SHALL accept three Boolean props, all off by default: `uploadButton`, `dropOverlay` and `dropHint`, with translated default labels `uploadButtonLabel` ("Add files"), `dropLabel` ("Drop to add") and `dropHintLabel` ("Or drag files onto this list."). With `uploadButton` a primary button SHALL open the same file picker as the New menu's upload entry, and the New menu SHALL render as secondary. With `dropOverlay`, while a drag that carries files is over the browser, a dashed frame with `dropLabel` centred SHALL cover the browser (decorative, `aria-hidden`), and a polite live region SHALL say `dropLabel`; after a drop it SHALL say how many files were added. A drag that crosses the browser's own children SHALL keep the state; a drag that carries no files SHALL not show it. A drop SHALL upload through the same path as the picker. With `dropHint` a line with `dropHintLabel` SHALL show under the list. CnFilesTab SHALL forward the three props.

#### Scenario: Off by default
- **GIVEN** a files browser with none of the three props
- **WHEN** files are dragged over it
- **THEN** it SHALL show the dashed outline it always had, no overlay, no live region, no button and no hint

#### Scenario: Dragging files onto the list
- **GIVEN** a files browser with `dropOverlay`
- **WHEN** files are dragged over it
- **THEN** the overlay SHALL read "Drop to add" and the live region SHALL say "Drop to add"
- **WHEN** the drag moves over a row and back
- **THEN** the overlay SHALL stay
- **WHEN** two files are dropped
- **THEN** both SHALL be uploaded with the same DAV PUT the picker uses
- **AND** the live region SHALL say "2 files added"

#### Scenario: Add files is a button
- **GIVEN** a files browser with `uploadButton`
- **WHEN** the user activates "Add files"
- **THEN** the file picker SHALL open
