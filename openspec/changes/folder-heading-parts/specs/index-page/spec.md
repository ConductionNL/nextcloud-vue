# index-page Delta

## ADDED Requirements

### Requirement: A group heading can name what its record carries

When a groups pane reads its tree from records, the heading of the selected group SHALL add one part per
`folderSidebar.headingParts` entry whose field the group's record carries, after its parent and its count. A part with
`format: "user"` SHALL name the user by display name. A field that is empty SHALL add nothing.

#### Scenario: DqAfdelingen

- **GIVEN** Team Vergunningen's record names its team lead `lars`
- **THEN** the heading reads "Vergunningen" over "Fysiek domein · 18 medewerkers · teamleider Lars de Koning"
