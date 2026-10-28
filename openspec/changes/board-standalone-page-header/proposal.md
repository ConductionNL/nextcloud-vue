# A standalone board page header takes the board title

## Why

A custom view that draws CnPageHeader itself (pipelinq's Forecast, board PqForecast) kept the Nextcloud title in the board look: 30px at weight 300, with the line under it 4px below. The board draws 28px/700 with the line 13px below.

## What changes

- In the board look, CnPageHeader's title is 28px/700 on a 1.2 line, and its description is 15px on a normal line, 9px below the title's own margin. Page primitives that style their header (index, links, reports) keep their more specific rules.
