# Proposal: row-action-openregister-verbs

kind: fix

## Why

OpenRegister writes `@self.actions` as permission verbs (`read`, `update`, `delete`, `destroy`, `export`, `assign`), while `CnIndexPage` matches its built-in row actions by their ids (`view`, `edit`, `copy`, `delete`). Only `delete` coincides, so a row that carries OpenRegister's block keeps Delete and loses View, Edit and Copy ([#1328](https://github.com/ConductionNL/nextcloud-vue/issues/1328)). Today OpenRegister writes the block only on single-object fetches; once list responses carry it, every manifest index page would keep only Delete on every row.

## What changes

- A built-in row action (`builtin: true`) also matches the OpenRegister verb that governs it: `read` permits View and Copy, `update` permits Edit, `delete` permits Delete. Copy needs the source readable; OpenRegister checks the schema-level `create` when the copy is saved.
- The mapping is additive: a built-in shows when the block allows its id or its verb. Servers that send `view`, `edit`, `copy` or `delete` behave as before, and a block naming neither still hides the built-in.
- App actions keep exact id matching, including one that shares a built-in id. `resolveRowActions` strips `builtin` from app actions, so only real built-ins carry the marker.
- `rowActionRefusal` returns the reason a governing verb was refused with. A built-in allowed by its id or its verb has no reason; when both are refused, the reason on its own id wins.
- `rowActionsNotDeclared` does not report a verb that a declared built-in uses.

The mapping lives in this library (`src/utils/rowActionAvailability.js`); OpenRegister does not change. Affects every consumer app that renders a `CnIndexPage` over rows carrying `@self.actions`; nothing changes for rows without the block.
