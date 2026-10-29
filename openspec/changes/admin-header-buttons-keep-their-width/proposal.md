# Proposal: admin-header-buttons-keep-their-width

## Why

On an admin settings page with a long path note (dossiq Geavanceerd), the header's button group shrank and the buildiq square wrapped under "Documentatie". The header grew from 102px to about 128px and every card under it moved down 26 to 42px (r34 DqBeheerGeavanceerd). The boards draw the group `flex: none`.

## What changes

- Under the board look, `.cn-admin-settings-shell__header-buttons` does not shrink; the title block wraps its path note instead.
