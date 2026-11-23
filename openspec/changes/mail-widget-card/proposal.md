# The mail widget stands in a card

## Why

DqZaakEmail draws the case's E-mail tab as two white cards: "E-mail" (its
header, the template row and the linked mail) and "Notities". The `mail`
widget renders CnMailTab, which draws its own title row, but its registry
entry asked for no card, so in a tab stack it stood bare on the page ground.

## What changes

The `mail` registry entry declares `ownsTitle: true` and `chrome: "card"`,
so CnDetailWidgetHost draws it in an untitled card on a card surface (a tab
stack, the side column), as the retention widget. A body grid cell and bare
chrome keep it bare.
