# Proposal: kb-search-board-rows

## Why

PL5-B measured PqOrganisatie's Kennisbank card: the field read "Search the knowledge base" on a Dutch page, because
the manifest's `content.placeholder` was shown as written, and the two suggested articles stood as bordered cards with
the book icon above the link. The board draws them as link rows, the icon before the title.

## What changes

The manifest placeholder reads through the host app's translate (`cnTranslate`). In the board look a suggestion is a
link row: no border or padding, the icon 8px before the title, 14px regular, underlined, in the link ink. The Nextcloud
look keeps its result cards.
