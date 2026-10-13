---
kind: code
---

# Proposal: screens-week-strip-max-per-day

## Summary

A day of the week strip lists every item that falls on it. On dossiq's Mijn werk a day with many deadlines
made the strip 1105px high in a 320px dashboard cell, over the widgets below it.

## What changes

1. `content.maxPerDay`: the most items a day shows. The rest sit behind "+N more".
2. `content.moreRoute` (a route name or object): "+N more" is a link to it, the full list. Without it
   "+N more" is a button that opens that day in place, and "Show less" closes it.
3. `content.moreLabel`: the text of the control, with `{count}`, through the host's translate. The default
   is the catalogue's "+{count} more" (nl "+{count} meer").

Without `maxPerDay` the strip renders as before. The manifest schema already allows extra keys on the
week strip's content, so it is not changed.
