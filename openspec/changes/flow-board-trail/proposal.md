# Proposal: flow-board-trail

## Why

DqFlow's second header row reads "Flow van zaaktype · Instellingen / Flows / Omgevingsvergunning regulier · versie 4":
the pill first, then each level as its own link. The flow board draws the pill beside the title and the list as one link
("Settings / Flows"). Its notice names the case type ("Deze flow is de werkwijze van het zaaktype Omgevingsvergunning
regulier"), and a static notice cannot.

## What changes

- CnFlowBoard and CnFlowEditorPage take `breadcrumb`, `[{ label, href? }]`: each level is its own link before the
  flow's name; a crumb without an href links to the flow list. Without it the one `listLabel` link stays.
- The pill moves to the start of the path row.
- `{name}` in the notice is the flow's name.

## Scope

nextcloud-vue only. `config.breadcrumb` already accepts a list of crumbs in the manifest schema: no schema change.
dossiq uses it on FlowDetail (DQ-ADMIN).
