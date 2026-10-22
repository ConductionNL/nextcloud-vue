# Proposal: group-parents-from-records

## Why

DqAfdelingen draws the organisation's departments as a tree (Gemeente Zuiddrecht, Fysiek domein, Vergunningen). Nextcloud
groups do not nest, and `folderSidebar.groups` nests them only by naming each group in the manifest, which an app cannot
do: the departments are the organisation's. Live the pane was a flat list of every group.

## What changes

A groups pane takes `parentsFrom: { register, schema, groupField?, parentField?, limit? }`. It reads those records and
lists the groups they name, each under its parent, as `groups` would. Records that cannot be read leave the pane flat.

## Scope

Additive. The pane's keys are free-form in the manifest schema, so no schema change.
