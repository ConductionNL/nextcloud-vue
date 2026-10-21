# A shipped configuration section

## Why

Every app that seeds objects (case types, roles, statuses) needs to show what it
shipped, what the instance changed and whether a newer version waits. dossiq had
this as its own screen; pipelinq, shillinq and decidiq need the same.

## What changes

- New `CnShippedConfigurationSection` over an app's shipped ledger endpoint.
