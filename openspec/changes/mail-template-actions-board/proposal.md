# The draft buttons stand together, the template one with its icon

## Why

DqZaakEmail draws the template field, then the two draft buttons together 8px apart, "Concept openen uit sjabloon" with an open-in-new icon. CnMailTab set the buttons as siblings of the field, 16px apart, without an icon (r32 verdict: gapNext 8>16, icon true>false).

## What changes

- The draft buttons stand in `.cn-mail-tab__template-actions` (flex, wrap, gap 8px); the template button carries the OpenInNew icon.
