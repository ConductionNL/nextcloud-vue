# Proposal: admin-buildiq-square

## Why

The admin settings boards of nearly every app (PqBeheer*, LpBeheer*, KqBeheer*, IqBeheer*...) draw the buildiq square in the header beside Documentatie. CnAdminSettingsShell placed CnBuildiqEditButton there, but on an admin page no CnAppRoot provides its availability or a manifest editor, so it never rendered (pl2: "button buildiq: missing on live" on all five PqBeheer boards).

## What changes

- CnAdminSettingsShell reads Buildiq availability itself and hands the square a link to the app with `cn_edit=1`.
- CnBuildiqEditButton with `href` and no editor is that link (same orange square).
- CnAppRoot enters edit mode once when the URL carries `cn_edit=1` and Buildiq is available, and drops the parameter.
