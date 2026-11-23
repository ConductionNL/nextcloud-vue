## ADDED Requirements

### Requirement: A field can be filled by scanning a code

A scan field SHALL open the camera only when the person presses Scan, SHALL fill the field with the first code read in
the formats it names and release the camera, and SHALL take a typed code at any time. Without `BarcodeDetector` it SHALL
offer typing only.

#### Scenario: a serial number from a label
- **WHEN** the person presses Scan and holds a Code 128 label in front of the camera
- **THEN** the field holds the label's code and the camera is off
