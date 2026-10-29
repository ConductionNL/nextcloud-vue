# A dashboard row of cards at one height

## Why
The boards draw a row of dashboard cards at one height. DqProcesanalyse's four KPI tiles are all 122px, though only one has a caption, and "Doorlooptijd per status" is as tall as the throughput chart beside it. Measured to their content, live drew the tiles 89/89/89/110px and the bar list 231 beside a 300 chart, and the packing grid lifted the chart under the shorter tiles (r36: "Doorlooptijd per status" y -27, h 231 vs 295; Doorstroom y -6).

## What changes
- A layout item `sameHeight: true`: the shorter size-to-content such cards of one layout row get a min-height of the tallest one (`planSameHeights`), so GridStack sizes their cells alike. A fixed-height card on the row (a line chart, which collapses when sized to content) counts as the height to reach and is not stretched. Every pass measures without the stretch first, so a row also shrinks. Edit mode and a reflowed grid keep each card at its own height.
- A stretched card keeps its content at the top.
- Schema: widgetEntry gains `sameHeight`.
