# Design: screens-facts-resolved-pill

- The text of a resolved pill is the resolved label, with `map` applied (unchanged from a resolved row).
- Tone keys, in order: the referenced object's `resolve.toneField` value (when set), the resolved label before `map`,
  the stored value. The first key present in `variantMap` (or `colorMap`, the same map under the name the table
  cells use) wins; no hit falls back to `variant`, then `default`.
- `toneField` is read with the same batched resolver as the label: one more list request per register, schema and
  field, shared by every facts widget on the page. When the field is empty on the referenced object the resolver
  answers its label, which is the second key anyway.
- Without `resolve` the lookup is by the stored value, as before.
