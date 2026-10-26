# A facts link's icon sits beside its text

## Why
r31 flagged "Werkinstructie" on five Dq case boards: the first row is inset 141 against 23, and it sits 2.2px high. The facts link is a block anchor, so its book icon stood on a line of its own above the text, and the text ran on a 21px line.

## What changes
In the board look, a facts link with an icon is a flex row: the icon beside the text, 10px apart, the text on the normal line and 10px under the title. With the rule injected on :8080 the text starts at 51 (board 50.8).
