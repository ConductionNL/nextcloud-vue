# An install can go into a chosen target

## Why
larpinq installs skill, condition and effect bundles into one world (`admin-configuration-store` task 1.1). CnStorePage
installed into the app as a whole and had no way to say where.

## What changes
CnStorePage takes `targets` (`config.targets`): a list of `{ id, label }` or an `optionsFrom`-shaped source, and
`targetLabel`. With targets it shows a picker, the first chosen, and the install request carries `{ target: <id> }`.
Without targets the install request is unchanged. The app's install endpoint decides what a target means.
