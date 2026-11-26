# A card says where its item is installed

## Why
larpinq's store board draws "Geïnstalleerd in De Zuiderlanden" on every installed bundle (larpinq
`admin-configuration-store` REQ-ACS-003). Installs can go into a target since `store-install-target`, but no card said
where an item went.

## What changes
CnStorePage reads `installed` from the store search response (slug to target ids, `''` for an install without
target; served by OpenRegister `store-installed-in`, ConductionNL/openregister#11153) and shows "Installed in
{targets}" on the card, naming each target by its label from `targets` and falling back to the id. A whole install
(`success: true`) adds its target at once, without a new search. An engine that does not report `installed`, or
reports it malformed, shows no line: the page behaves as before.

## Not done here
The "Past bij" (fits the active world) filter the larpinq board draws: it needs a notion of the active target the
page does not have yet.
