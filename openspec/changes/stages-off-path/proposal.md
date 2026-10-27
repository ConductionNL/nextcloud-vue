# Stages off the main path

## Why

Board DqSociaalDomein (design-system #678, Ruben 27 Oct) draws the Jeugdwet main path only, as DqZaak does. The strip had no way to leave out a side status ("Verlenging aangevraagd", "Ingetrokken"), so live drew all ten.

## What changes

- `stagesEndpoint` and `stagesSource` take `offPathField`: a row holding true there is left off the strip unless it is the record's current stage.
