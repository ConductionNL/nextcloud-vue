# Proposal: board-dashboard-text-card

## Why

COMPDIFF r24 on DqDagAfsluiten "Hoe dit werkt": the board sets a text card's paragraph 8px under the title at the
card's inset, 14px at 1.5. Live, CnTextWidget padded its text 16px all round inline (17px in, 32px under the title), and
the theme set the paragraph at 15px.

## What changes

In the board look a CnTextWidget on a dashboard card sits at the card's inset, 8px under the title, with 20px below it;
its blocks take the widget's font size at a 1.5 line height and lose their outer margins. The Nextcloud look is
unchanged.
