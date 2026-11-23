# Proposal: object-table-footnote

## Why

DqTermijnen draws a muted line under the Ingebrekestellingen table ("Een ingebrekestelling telt pas als de
beslistermijn voorbij is (Awb 4:17). ..."). CnWidgetObjectTable had no way to carry one, so dossiq could not draw it.

## What changes

CnWidgetObjectTable takes `footnote`: a string drawn under the table, 12px below it in 13px muted text, through the
host translate. It is not drawn while a refused or failed endpoint read shows no table. A dashboard's `object-table`
content passes it through like any other prop.

## Scope

nextcloud-vue only. dossiq sets it on the DqTermijnen notices table.
