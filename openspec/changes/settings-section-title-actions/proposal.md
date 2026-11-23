# Proposal: settings-section-title-actions

## Why

The boards draw a settings section's buttons in its title row, beside the heading: DqVthInstellingen "Activiteit
koppelen", "Regel toevoegen" and "Checklist toevoegen", DqInstellingenAlgemeen "Dag toevoegen". CnSettingsSection floats
its actions right above the content, under the heading and the description, and the working calendar draws Add day in
its own body.

## What changes

CnSettingsSection takes `actionsInTitle`: the heading and the `actions` slot share the first row, the description and
the content run below across the width. CnWorkingCalendarWidget takes `content.addButton: false`, which leaves its Add
day button out so the host's title row can carry it and open the form through `openAdd()`.
