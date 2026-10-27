# A dashboard widget can be drawn on a phone only, or on a wider window only

## Why
Board PqMobiel draws My work on a phone as a single list grouped by when each item is due, while PqMijnWerk draws three lists and a side column. On a phone the board grid already stacks every widget into one column, but the page can't swap in a different widget for the phone.

## What changes
A widget definition can declare `viewport: "narrow"` (drawn only under 640px, the breakpoint where the board grid stacks) or `viewport: "wide"` (drawn only from 640px up). A widget left out of the current viewport gives up its cell, as a widget hidden by a page control does. A widget without `viewport` draws everywhere.
