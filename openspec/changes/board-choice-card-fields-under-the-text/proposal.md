# A chosen option's fields start under its text

## Why
r31 measured DqVolgendeStap "Opschorten" 11.6px low: from the description to "Reden" is 12px on the board and 23.6px live. The row's 12px bottom padding and the cell's 8px gap add up, and the field label runs on the dialog's 1.5 line.

## What changes
In a board dialog, the chosen option's cell puts its fields 12px under the option row, and the row adds no bottom padding. The field labels sit on the normal line. With the rules injected on :8080, "Reden" sits at 264.4 against the board's 265.
