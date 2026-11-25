# Tasks: avatar-cell-wraps

- [x] 1.1 Test: the table stylesheet lets an avatar cell's name and secondary line wrap in a `cn-cell--wrap` cell (`tests/css/avatarCellWraps.spec.js`, red on main).
- [x] 1.2 `table.css` rule for `td.cn-cell--wrap .cn-cell-renderer__avatar-name, __avatar-secondary`.
- [x] 1.3 Live: DqContacten addresses read in full once dossiq sets `cn-cell--wrap` on the Name column.
  - Done 25 Nov 2026 on a sandbox instance (NC 34.0.6) with 2.225.1 and dossiq #6927/#6932: no Contacts row is clipped; "Oosthavenweg 12, Zuiddrecht" reads in full over two lines.
