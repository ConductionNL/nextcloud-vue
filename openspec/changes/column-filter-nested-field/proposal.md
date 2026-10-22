# A header filter on a nested field, or on the field a column names

## Why

DqOrganisaties and DqContacten draw a funnel on every column header. On live,
"Plaats" (`address.place`) and "Woonplaats" (`residence.city`) had none. A
dotted key found no schema property, even though OpenRegister filters a path
inside an object property by its dotted name. The computed columns, "Lopende
zaken" and "Laatste contact", had no funnel either, because nothing told the
table which stored field they could filter on.

## What changes

- A dotted column key resolves through the `properties` of each object
  property. The column filters that nested field under its dotted name.
- A column may set `filterField`, the stored field its header filter works on.
  The field's property decides the kind. A computed column that names a
  `filterField` gets a filter.
