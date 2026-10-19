# card-layout-part-formatter

## Why

Board DqAanMijToegewezen draws the card's meta line as plain text ("Melding · B. Smit"). A meta part that names a page
column draws through that column's widget, so a case type column with a badge drew a badge in the meta line, and a
hidden column cannot serve the card because hidden columns are not rendered.

## What changes

- A `cardLayout.meta` part can be `{ field, formatter?, formatterOptions? }`: plain text through its own formatter,
  never a column's widget. A field name keeps reading through the page column it names. Schema 2.129.0.
