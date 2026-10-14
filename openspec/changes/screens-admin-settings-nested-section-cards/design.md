# Design: screens-admin-settings-nested-section-cards

`display: contents` on a direct child of the shell that itself holds sections (`:has(> .settings-section)`) lifts those
sections into the shell's grid. The card selector gets the same one-level path. One level only: a wrapper inside a
wrapper is not matched, and a child that holds no sections keeps spanning the grid as before. The wrapper keeps its
element, so its own attributes and listeners stay; `display: contents` drops only its box.
