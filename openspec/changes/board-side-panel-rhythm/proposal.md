---
kind: code
---

# Proposal: board-side-panel-rhythm

## Summary

The saved-view side panel in the board look sits lower and further in than
DqFilterBeheren, DqFilterInMenu and DqFilterDelen draw it (dossiq r31). This
change matches the board in CSS only, inside the board look:

1. The tab's content starts 20px in from the panel edge (the tab's 10px plus a
   10px section padding), not 26px.
2. The subtitle sits 2px under the title at a normal line height, so the tabs
   start where the board draws them.
3. A saved view's name and a share row's name use a normal line height.
4. The saved-view manage menu is 278px wide outside: the board's 264px of
   content, 6px in and a 1px line.

The Nextcloud look is unchanged.
