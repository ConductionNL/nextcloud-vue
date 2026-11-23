# Design: abstract-radio-cards

- Read: `String(objectData[field])`; the card whose `String(value)` matches is selected.
- Write: choosing PATCHes `{ [field]: option.value }` (the typed value, not the string) only. Inputs are disabled while
  the request runs; on failure the choice returns to the last saved value and the server's message shows.
- Markup: a fieldset of labels, each with a real, visually hidden radio input covering the card, so keyboard and
  screen readers work and the selection is also shown by a dot and a border (not by colour alone).
- Look: 1px `--color-border-maxcontrast` card, 8px radius, 12px 14px padding; selected = primary border + light primary
  background; 14px dot; 600 title, 12px muted description. Two columns by default, one under 640px.
- Security: one configured field is sent; OpenRegister authorises the PATCH.
