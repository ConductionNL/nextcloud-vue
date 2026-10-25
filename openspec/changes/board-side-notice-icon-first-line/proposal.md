# The side notice's icon sits on the first line

## Why

The boards draw the warning icon of a case's side notice ("Advies gevraagd")
beside the first line of its text. Live centred it on the three-line notice:
the icon's own `align-self: center` (vue-material-design-icons) beat the
`margin-top: 2px` the board rule set.

## What changes

The board rule for the side notice's icon adds `align-self: flex-start`.
