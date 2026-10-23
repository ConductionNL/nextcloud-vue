# Proposal: named-source-refresh

## Why

Board DqPostvak draws an Actions menu in the header. Its Refresh entry reloaded only a register list, so on a page over
a named source (the inbox, the tasks list) it did nothing.

## What changes

`useNamedSource` returns `namedReload`, and CnIndexPage's Refresh reads the named source again.
