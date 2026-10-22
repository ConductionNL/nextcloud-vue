# board-link-tile

## Why

A link tile drew as a square with a centred 48px icon and a centred title. The board draws it as a rounded card with the
icon beside a bold title and a line under it (PtThemas "Themacatalogus", "Portalen en hun thema's"), and the tile had
no way to say that line.

## What changes

- A tile takes an optional `subtitle` (on the widget or in its `content`), drawn under the title.
- In the board look a tile is a rounded card: radius 12, 20px 22px padding, a 24px icon beside the text, a 15px bold
  title and the 13px subtitle, left-aligned, without the hover zoom.
