# Proposal: board-text-description-ends-8px

## Why

COMPDIFF r32, DqDashboard, DqMijnWerk and DqMijnTeam: the page header was 72.5px against 76 drawn. The boards set the
greeting line at the font's normal line height and pad the header 8px under it; live set it at 1.5 with nothing under
it, so everything below sat 3.5px high.

## What changes

In the board look only, a dashboard description that holds no filter controls is set at `line-height: normal` and pads
8px under it. A description with selects or a segmented control (DqDoorlooptijd, DqProcesanalyse, DqTermijnen) keeps its
height.
