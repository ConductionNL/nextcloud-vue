# Related objects: link rows, and sections that show once they answer

## Why
On board PqLead, "Gerelateerd" starts with three lines: "Prospectgegevens uit de KVK", "2 eerdere deals, allebei gewonnen" and "Uren op deze lead: 14,5". On live the card said "Laden …" for about 6 s. Relations and files had answered empty within about 2 s, but `uses` and `used` take 5.6 s each.

## What changes
- `content.links`: link rows above the related objects. Each row is `{ label, icon?, href?, route?, endpoint?, path? }`. A label's `{field}` placeholders are filled from the endpoint's answer, and a row that cannot fill yet is left out.
- Once any section has answered, the card names the sections still loading ("Still loading: Objects") instead of "Loading …".
