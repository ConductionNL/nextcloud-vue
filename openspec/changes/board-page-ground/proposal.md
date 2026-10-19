# Proposal: board-page-ground

## Why

The boards draw the content area light grey (`#f5f6f8`) behind white cards. Live, the grey comes from the theme's
content surface token on `#app-content-vue`, and it showed on 56 of dossiq's boards. On DqTeamwachtrij the whole page
was white: the nldesign theme's element overrides paint every `[class*="panel"]` with the main background, and the
index page with a side panel carries `cn-index-page--with-side-panel`. That rule carries an id through
`:not(#header *)`, so no class rule of the look outranked it.

## What changes

In the board look a page root (index, detail, dashboard, settings, store, admin settings) draws a transparent
background, with an id named in `:not()` so the rule outranks a theme rule that carries one. The content area's ground
shows through; the colour stays the theme's, so an NL Design theme recolours it, and the cards keep their own ground.
