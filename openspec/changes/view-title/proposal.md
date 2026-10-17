# Proposal: view-title

## Why

Board DqMijnTeam: switching dossiq's "Mijn werk" page to the "Mijn team" view changes the page title to "Mijn team".
A dashboard's title stayed the page's whatever view was open.

## What changes

- `views[].title`: the page title while that view is open, through the app's translations.
- A view without one keeps the page title.
- Manifest schema 2.119.0.
