# user-settings-dialog-board-sections

## ADDED Requirements

### Requirement: The dialog's sections read as the board draws them

CnUserSettingsDialog SHALL set `--app-settings-section-text-offset: 0` on its sections. CnOrderedListField SHALL accept `hideLabel`, keeping the label as the list's accessible name and out of sight; CnSavedViewMenuSettings SHALL pass it. In its board look CnNotificationMatrix SHALL set `--nldesign-component-table-header-background-color: transparent` on its table and draw its head cells at line height 1.2.

#### Scenario: Weergaven in mijn menu
- GIVEN the user settings dialog under thematiq
- THEN the heading "Weergaven in mijn menu" starts at the description's left edge, no second "Weergaven in mijn menu" shows above the list, and the Meldingen grid's head is white
