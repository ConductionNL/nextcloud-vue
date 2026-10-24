# A board dialog's body starts 22px under its header

## Why

Every Dq dialog board pads its header 4px at the bottom and its body 18px at
the top: the first field or choice starts 22px under the header text. The
board dialog pulled the header 2px into the body's 18px gap instead (16px), and
set a choice legend at the page's 15px on a 22.5px line where the boards draw
14px/600 on the normal line height. DqDocumentGenereren r26a measured the
first block 4px short.

## What changes

In the board dialog the header keeps 4px under it (22px to the body), and a
choice-cards legend is 14px, weight 600, normal line height.
