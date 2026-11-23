# Proposal: saved-view-share-rows

## Why

Board DqFilterDelen draws the share dialog of a saved view as a full-width "Share with" search field and, below it,
a "Shared with" list: one tinted row per person or group with an avatar, the name, the kind, a rights select
("May use" / "May update") and a remove button. CnSavedViewShareFields put the picked people as chips inside a
multiselect and gave each entry two radio buttons, so the dialog read as a form of loose controls.

## What changes

- The search field adds one person or group at a time and stops offering who is already in the list.
- Each entry is a row: avatar, name, kind ("Person" / "Group"), a rights select, a remove button.
- A search result shows avatar, name and a kind pill.
- The stored audience (`[{ group | user, mode }]`) and the events stay the same.
