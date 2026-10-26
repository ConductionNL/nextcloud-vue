# A facts link takes its words from the record

## Why
The Dq case boards draw "Werkinstructie" as the page's own title ("Hoe we Woo-verzoeken behandelen") and a muted line naming where it lives ("Uit Collectives, team Woo en informatie."). Live drew a fixed label and no line: a facts link's label was constant text.

## What changes
- A facts link's `label` and a new `note` (a muted line under the link) fill `{path}` and `{path:format}` placeholders from the record.
- Two new formats, `first-segment` and `last-segment`, read one part of a path such as a Collectives page.
