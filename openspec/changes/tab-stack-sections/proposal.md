# Proposal: tab-stack-sections

## Why

PqLead draws its Overzicht tab as one sheet: the stage strip without a title, then Deal, Producten op deze lead, Contacten en hun rol and Uitvoeringen van flows as sections of the panel, a hairline above every section after Deal. A stack tab (`widgetIds`) draws every widget as its own titled card, so live showed a "Fasen" card joined to the tab and four cards under it. COMPDIFF pl4 PqLead 4 (`borderRadius 0>12`, `titleInsetTop 76>21` on Deal), 18 (the "Fasen" card extra on live), and 1-3/8 (the y offsets that follow).

## What changes

- A stack tab takes `sections: true`. In the board look the panel is the card again (border, the joined top-left corner, the main background) and the stack's widgets lose their own card. A section that follows a titled section has a hairline above it, 24px under the previous section and 22px over its title.
- In a stack a widget whose definition says `showTitle: false` draws no title (the stage strip). Before, every widget in a stack was titled.

## Scope

CnTabsWidget (one class, one key read, `showCardTitle` from the definition) and `look-board-detail.css`. Off by default: Dq stacks (DqContact, DqZaakEmail, DqSociaalDomein) keep their cards. No manifest of dossiq or pipelinq sets `showTitle: false` on a stacked widget today.
