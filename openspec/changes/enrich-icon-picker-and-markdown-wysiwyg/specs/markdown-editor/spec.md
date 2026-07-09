## ADDED Requirements

### Requirement: Opt-in WYSIWYG mode

`CnMarkdownEditor` SHALL accept `wysiwyg` as an additional value of its `mode` prop, alongside the existing `edit`, `split`, and `preview` values. The default mode SHALL remain unchanged. When `mode` is `wysiwyg` the component SHALL render a rich WYSIWYG editor backed by Toast UI; in every other mode it SHALL render the existing textarea/preview experience.

#### Scenario: Default mode is unchanged
- **WHEN** `CnMarkdownEditor` is rendered without a `mode` prop
- **THEN** it renders the existing textarea-plus-preview experience with no WYSIWYG editor mounted

#### Scenario: WYSIWYG mode mounts the rich editor
- **WHEN** `CnMarkdownEditor` is rendered with `mode="wysiwyg"`
- **THEN** a Toast UI WYSIWYG editor is mounted with the configured toolbar

### Requirement: Lazy-loaded editor dependency

The Toast UI editor and its stylesheet SHALL be loaded lazily and only when `wysiwyg` mode is active. The `edit`, `split`, and `preview` modes SHALL NOT import the Toast UI editor.

#### Scenario: Non-WYSIWYG modes carry no editor cost
- **WHEN** `CnMarkdownEditor` is rendered in `edit`, `split`, or `preview` mode
- **THEN** the Toast UI editor module is not imported

#### Scenario: WYSIWYG mode imports on demand
- **WHEN** the editor first enters `wysiwyg` mode
- **THEN** the Toast UI editor module and CSS are imported at that point

### Requirement: Preserved v-model contract

In `wysiwyg` mode `CnMarkdownEditor` SHALL preserve the `value`-in / `input`-out v-model contract used by the other modes. It SHALL initialise the WYSIWYG editor from the current `value` and SHALL emit `input` with the edited content.

#### Scenario: WYSIWYG round-trips through v-model
- **WHEN** a consumer binds `v-model` and edits content in `wysiwyg` mode
- **THEN** the component emits `input` with the updated content
- **AND** the editor initialises from the bound `value` on load

### Requirement: NC-variable theming and configurable toolbar

The WYSIWYG editor SHALL be themed using Nextcloud CSS variables (no `--nldesign-*` references) and SHALL expose a configurable toolbar comparable to the source implementation (headings, bold/italic/strike, hr/quote, lists/task/indent, table/image/link, code/codeblock).

#### Scenario: Toolbar is configurable
- **WHEN** a consumer supplies custom toolbar configuration
- **THEN** the WYSIWYG toolbar reflects that configuration
