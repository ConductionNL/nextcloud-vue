# Proposal: phone-list-look

## Why

pl3 PqMobiel measured pipelinq's My work at 375px against the board. The filter bar sat in a card (the board draws it on the page ground). The lens chips were a grey segmented group that wrapped (the board draws separate pills in one row). The due groups sat as headings inside one widget card (the board draws an uppercase heading over each group's own card, "TE LAAT" in the error ink). Each of these is a phone look the widgets could not express.

## What changes

- CnDashboardPage: a widget definition's `borderless` is read when its placement says nothing: `true`, or `"narrow"` / `"wide"` to drop the card on a phone / a wider window only. A kpiRow widget has no placement, so this is the only way it can go without a card.
- CnSegmentedControl `phonePills`: under 640px the options are separate 34px pills in one row that scrolls sideways, the chosen one filled in the main ink. Wider windows keep the segmented group.
- CnWorkspaceFilterWidget: a chips control with `chipsOnPhone: "pills"` passes `phonePills`.
- CnRecordListWidget with `groupBy`: `groupLook: "cards"` draws each group as its own card under an uppercase 13px heading in the soft ink; `groupTones: { <value>: error | warning | success | primary }` tones a group's heading.

All opt-in. A page that sets none of them looks as before.
