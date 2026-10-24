# fit-table-wrap-column-keeps-width

In a table fitted to its tile, the growing column has `max-width: 0` and is cut with an ellipsis. When the other
columns' one-line cells were wider than the tile, it was squeezed to its padding (DqDoorlooptijd "Zaken met risico"
and "Prestaties per zaaktype": 24px title columns). A growing column that opts into wrapping now wraps and keeps 8em.
