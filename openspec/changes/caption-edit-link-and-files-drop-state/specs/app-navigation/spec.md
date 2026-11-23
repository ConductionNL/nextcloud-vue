## ADDED Requirements

### Requirement: A caption with an href carries a pencil link

CnAppNav SHALL render a menu entry of `type: "caption"` that carries `href` with a link beside its heading, inside `NcAppNavigationCaption`'s actions slot, showing a pencil icon and named "Change {caption label}" (translated). A caption without `href` SHALL render as before, with no link. The link SHALL open `href` in the same way an item's internal `href` does.

#### Scenario: The pencil beside My case types
- **GIVEN** a menu with `{ id: "mine", type: "caption", label: "My case types", href: "/index.php/settings/user/dossiq" }`
- **WHEN** the navigation renders
- **THEN** the caption SHALL hold a link to `/index.php/settings/user/dossiq` with a pencil icon
- **AND** the link's accessible name SHALL be "Change My case types"

#### Scenario: A caption without href is unchanged
- **GIVEN** a caption entry without `href`
- **WHEN** the navigation renders
- **THEN** no link SHALL be drawn beside the caption
