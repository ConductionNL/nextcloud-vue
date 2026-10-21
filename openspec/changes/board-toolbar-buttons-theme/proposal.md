# Proposal: board-toolbar-buttons-theme

## Why

The boards draw an index toolbar's Filter button as a neutral control: the main text at weight 600 on the main
background, a grey border, 12px at both sides, 14px text (DqTeamwachtrij). Under the nldesign theme, which paints a
secondary button in the primary colour with `!important` through its button tokens, the live "Filter" and "Weergave
opslaan" drew blue text and borders at 700, and NcButton's icon layout padded Filter's start 4px with 15px text. The
same token cause was fixed for header buttons (board-header-buttons-theme).

## What changes

In the board look the toolbar (`cn-actions-bar`) sets the theme's button tokens to the board's neutral button, and the
Filter button keeps 12px sides and 14px text.
