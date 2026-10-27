# Choice rows side by side are as high as the tallest

## Why

With `layout="rows"` and `columns` above 1, each option's row was as high as its own text. DqZaakSamenwerken draws "Delen" and "Overdragen" side by side at the same height; live drew "Delen" 60px high beside "Overdragen" at 76 (r32 strict, toggle "Delen" visually differs).

## What changes

- A row without details fills its grid cell, so rows side by side match the tallest. A row with details keeps its own height, with the fields under it. A single column does not change.
