# Design: screens-avatar-row-height

- 59 = 12 + 34 + 12 + 1: the cell's block padding is 12px, the name line 18px, the second line 16px, the hairline 1px.
- The avatar box is aligned to the top of its line, so the line box adds nothing under it whatever the host's line height.
- Selected with `td:has(.cn-cell-renderer__avatar-secondary)`: an avatar without a second line keeps the normal row.
