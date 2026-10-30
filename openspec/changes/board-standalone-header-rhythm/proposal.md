---
kind: code
---

# Proposal: board-standalone-header-rhythm

## Summary

The pl4 measurement of pipelinq's custom views (PqWeekoverzicht,
PqZoekinzicht, PqForecast, the newsletter results and PqPipeline) reads the
line under a standalone page header 9.6px below the title where every board
draws 13, and the labelled header buttons 34px where the boards draw 40, the
Dq page headers' control height. Dq wins where Pq and Dq differ, and live Dq
headers stand at 13 and 40. The standalone header's description margin goes
from 9px to 12.4px and its labelled buttons take the control height. Where
the title starts (92 vs 96) is the hosting view's padding, so it is fixed in
the app's views, not here: a shared top inset would push the headers that
stand under a back link further down.
