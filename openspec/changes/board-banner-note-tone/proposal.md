# board-banner-note-tone

## Why

In the board look a warning or error banner (CnBannerWidget) drew NcNoteCard's own shape: a 4px edge bar on the
left, radius 4 and 8px of padding, with a 15px margin above and below. The boards draw a tinted box with a 1px edge in
the banner's tone (PtInzending, PtAccounts). On an index page the banner also sat inside a white stat-row card.

## What changes

- A warning or error banner in the board look is a tinted box: radius 10, 12px 14px padding, a 1px edge in its tone,
  the text in the main ink, no margin.
- A stat-row cell on an index page that holds only a banner draws no card around it.
