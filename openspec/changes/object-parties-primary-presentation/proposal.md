## Why

Board DqOrganisatie has a side card "Hoofdcontact": the organisation's main contact as a lead (initials tile, name,
role as the muted line), that person's own e-mail address, and a foot link "Alle 2 contactpersonen" that opens the
tab with every contact person. dossiq models the contact persons as OpenRegister person parties on the organisation,
the main contact as the primary link (dossiq change `organisation-contact-persons`).

The `parties` widget draws every party grouped by role. It cannot draw only the primary one, as a side card does.

## What Changes

- `CnObjectPartiesWidget` gets `content.presentation: "primary"`: only the primary party, as a lead (initials,
  display name, role label), then the correspondence e-mail the listing carries for it as a `mailto:` link, then
  `content.link` at the foot (`{ label, href? | tab? }`, `{total}` in the label is the number of parties).
  `tab` opens that tab of the page through the route hash, as a header link `{ tab }` does.
- It reads the listing only: no per-party reads, no kinds, extra lines or correspondence.
- No primary party: `labels.noPrimary` ("No main contact yet"), and the foot link still shows when there are parties.
- A failed listing says so, as in the full presentation.
- The full presentation is unchanged. No schema change (widget content is open).
