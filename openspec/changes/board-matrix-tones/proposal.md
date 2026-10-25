# Proposal: board-matrix-tones

## Why

DqHandhaving draws the LHS matrix cells on the status grounds the boards use for badges: #E7F3EA, #FFF4DE, #FCEDEC and a
deeper #F6D6D3. Live mixed Nextcloud's status colours into white (compdiff r26a: (221,233,223) for (231,243,234),
(249,224,224) for (252,237,236), (242,191,191) for (246,214,211)).

## What changes

In the board look, a matrix cell's success, warning and error grounds take the theme's status badge background tokens
(falling back to what they were); danger takes `--nldesign-component-status-badge-danger-background-color`, else the
error ground deepened by 10% of the error colour. Checked on :8080 with the rules injected: (231,243,234),
(255,244,222), (252,237,236), (247,213,212).
