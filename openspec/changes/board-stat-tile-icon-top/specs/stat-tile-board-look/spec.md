## ADDED Requirements

### Requirement: a board stat tile can carry its icon in a circle above the label

Under the board look, a stat tile with `content.iconPlacement: "top"` and an icon MUST draw the icon in a 42px circle above the label, with a 22px glyph, 10px over the label, tinted by the tile's state, and MUST NOT draw the glyph before the label. A tile without the key MUST keep the glyph before the label, and `"end"` MUST keep the 32px circle at the end of the label row.

#### Scenario: learniq Today tile
- GIVEN the board look and a tile with `icon` and `iconPlacement: "top"`
- THEN a 42px circle sits above the label, tinted primary light, warning for a warning tile

#### Scenario: dossiq tile unchanged
- GIVEN the board look and a linked tile without `iconPlacement`
- THEN the 18px glyph sits before the label and there is no circle

#### Scenario: Nextcloud look
- GIVEN no board look and `iconPlacement: "top"`
- THEN the tile renders its icon circle beside the body as before
