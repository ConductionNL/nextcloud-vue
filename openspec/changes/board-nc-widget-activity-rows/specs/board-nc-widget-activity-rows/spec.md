# board-nc-widget-activity-rows Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-nc-widget-activity-rows](../../)

## Purpose

A Nextcloud dashboard widget on a board dashboard card reads as the board's activity list.

## ADDED Requirements

### Requirement: A board dashboard NC widget draws its items as activity rows

In the board look, the items of a vertical CnNcWidgetWidget inside a dashboard card SHALL be rows with a hairline above
each, 12px above and below the text, the text starting 12px after a 10px dot in the primary colour, at the card's 24px
inset. The title SHALL be 14px, regular weight, in the main ink, wrapping instead of being cut off, and not underlined;
the subtitle SHALL be 13px. The body SHALL start 2px under the header, so the first row's hairline stands 12px under
the title. The horizontal mode and the Nextcloud look SHALL be unchanged.

#### Scenario: My work's recent activity card

- GIVEN DqMijnWerk in the board look with the "Recente activiteit" card showing the activity widget
- WHEN the card renders
- THEN the first activity's dot is 25px from the card's edge and its text 26px under the title
- AND each activity is a row with a hairline above it and its title in the main ink
