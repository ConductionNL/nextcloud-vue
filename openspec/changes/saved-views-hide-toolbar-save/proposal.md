# The toolbar leaves Save view out when the header saves the view

## Why

DqZoekresultaten saves a search from its header ("Zoekopdracht opslaan") and draws no "Weergave opslaan" in the toolbar. Live drew both.

## What changes

- CnSavedViewsControl takes a `save` prop, true by default.
- CnIndexPage sets it to false when the page header carries a `save-view` button.
