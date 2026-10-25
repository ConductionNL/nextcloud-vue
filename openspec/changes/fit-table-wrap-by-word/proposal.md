# fit-table-wrap-by-word

In a table fitted to its tile, the non-growing columns take `width: 1%`. A column with `cn-cell--wrap` wrapped with `overflow-wrap: anywhere`, which makes its minimum width one letter, so DqDoorlooptijd's wrapping heads broke letter by letter (Prestaties head 327px, Zaken met risico 242px). In a fitted table a wrapping column now breaks between words.
