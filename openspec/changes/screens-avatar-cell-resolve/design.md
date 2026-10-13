# Design: screens-avatar-cell-resolve

- `widget: "avatar"` with `widgetProps.resolve` (both `register` and `schema` set) renders CnFkResolveCell around the
  avatar markup. The slot hands out the label, and the cell draws the initials circle (`widgetProps.size`, default
  24, or 32 under the board look) and the name, plus the column's secondary line, as the plain avatar cell does.
- While the name is loading, and for an id that cannot be resolved, the name slot shows the id and the circle stays
  empty. Initials are drawn only for a resolved name.
- Resolution, caching and de-duplication are CnFkResolveCell's, unchanged: one request per referenced object per page.
- Without `resolve`, the avatar cell is unchanged.
