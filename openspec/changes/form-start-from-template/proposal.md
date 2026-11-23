# A create form can start from a saved template

## Why
OpenRegister keeps record templates (`/api/record-templates`, records-saved-templates D-1 to D-4) and its own create
dialog starts from one. Leaf apps' create forms are CnFormDialog, which had no picker, so the feature stopped at
OpenRegister (task 2.3).

## What changes
CnFormDialog takes `templateSource: { register, schema }`. A create form reads the templates of that register and
schema and offers a "Start from a template" picker; picking fills the fitting values, names the ones left out (field
gone or type changed) and keeps fields the person already changed. CnIndexPage takes `recordTemplates`
(`config.recordTemplates`) and hands its register and schema to the create form. Dutch strings added.
