# Design: screens-segmented-tabs-wrap

- `.cn-tabs.cn-tabs--segmented.cn-look-board`: the strip may shrink to its container (`min-width: 0`,
  `max-width: 100%`) and its nav wraps (`flex-wrap: wrap; overflow: visible`), as the line strip does.
- The track keeps its width (shrink to content); only a strip wider than its container changes.
- The scroll chevrons and edge fades render only while the strip overflows, so they disappear with the overflow.
