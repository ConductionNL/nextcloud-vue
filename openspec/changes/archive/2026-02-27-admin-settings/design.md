# Design: Admin Settings Components

## Components
- **CnSettingsSection**: Wraps one or more CnSettingsCard components in a titled, collapsible section with optional description text
- **CnVersionInfoCard**: Displays app version, dependency versions, and build metadata in a structured CnSettingsCard layout

## Key Decisions
- CnSettingsSection uses slot-based composition to wrap any child components
- CnVersionInfoCard accepts a structured config object for flexible version/dependency display
