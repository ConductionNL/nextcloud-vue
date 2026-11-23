# Proposal: a-user-field-reads-its-display-name

## Summary

A `referenceType: nextcloud-user` field in `CnObjectDataWidget` shows the user's display name in read mode.

## Why

Zuiddrecht rehearsal R2 (15 October 2026): "Toegewezen aan" read `thomas.kuiper`. Group fields already showed the group's name (`CnGroupNameCell`); user fields fell through to the plain value.

## What changes

- Read mode renders a user field through the names `resolvePersonLabels` already looks up for the editor, with the uid as tooltip and as fallback.
- The names are looked up on mount and whenever the object or schema changes.
