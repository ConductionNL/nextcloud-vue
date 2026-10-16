# Proposal: board-neutral-column-colour

## Why

dossiq retires its own WorkflowBoard for the library board. A board on referenced status rows merges rows with the
same name into one column (`mergeBy`), and that column took the colour of its first row. dossiq's `statusType.colour`
stores "grey" by default, so a status nobody coloured reads back exactly like one somebody made grey. Whichever case
type the API listed first then decided whether an authored orange reached the column at all. dossiq's old board took
a chosen colour over grey in either position (`mergeColumnColour`, e2e REQ-CT-19).

## What changes

- `columnFields[].source.neutralColor`: the colour a referenced row holds when nobody chose one.
- A column merged from several rows takes the first row colour that is not the neutral one, and the neutral one only
  when no row has another. Colours are compared as written, as dossiq compares them.
- Manifest schema 2.101.0.

Without `neutralColor` a merged column takes its first row's colour, as before.
