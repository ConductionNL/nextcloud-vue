## ADDED Requirements

### Requirement: The audience of a saved view is a list of rows

The share fields of a saved view SHALL offer one search field that adds a single person or group per pick, and SHALL
list the audience under "Shared with" as one row per entry with an avatar, the name, the kind, a rights select and a
remove button.

#### Scenario: Picking a search result
- GIVEN a view shared with group "desk"
- WHEN the user picks the person "Fatma Yilmaz" from the search
- THEN the audience becomes desk (unchanged rights) and Fatma with "May use"
- AND the search no longer offers desk or Fatma

#### Scenario: A row per entry
- GIVEN a view shared with group "desk" (read) and user "fatma" (write)
- THEN two rows show "Handling desk · Group · May use" and "Fatma Yilmaz · Person · May update"
- AND no radio buttons are drawn
