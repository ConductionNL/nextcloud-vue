# Proposal: tab-stack-keeps-cards

## Why

A tab that declares a stack (`widgetIds`) draws its widgets as titled cards. When the record's conditions hid all but
one of them, the tab fell back to a plain panel: the one card lost its title and its card. On a Jeugdwet case the
Overview stack shows only "De melding" (the generic cards give way to the case type's `overviewCards`), so the board's
titled card "De melding" was drawn untitled (COMPDIFF r19 DqSociaalDomein: card "De melding" missing on live).

## What changes

A stack of two or more widgets that resolve stays a stack of titled cards, whichever of them its conditions show. A
stack that names only one existing widget is still a plain tab, as before.
