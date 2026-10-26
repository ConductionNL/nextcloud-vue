# record-list-pill-color-field

DqMijnWerk draws a case status pill in the status type colour ("In behandeling" purple, "Besluit" teal). The record list only coloured a pill through a value map, so live drew the grey default (r31 verdict pill "In behandeling" background/colour). `pill.colorField` reads a colour name from the row (the status type colour) and maps it with the library colour vocabulary (variantForColor).
