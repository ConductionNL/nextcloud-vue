# Design: settings-components

## Architecture

This change implements the settings-components specification as part of the @conduction/nextcloud-vue component library. Specifies the admin settings components: CnSettingsCard, CnSettingsSection, CnConfigurationCard, CnVersionInfoCard, CnStatsBlock, and CnRegisterMapping. These components provide a consistent, themeable settings page layout for all Conduction Nextcloud apps.

## Implementation Approach

All 10 requirements from the spec have been implemented directly in the source components, composables, or utility modules as specified. The implementation follows the library's existing patterns: Vue 2 Options API for components, Pinia for stores, and standard ES module exports for utilities.

## Dependencies

- @nextcloud/vue (Layer 1 components)
- Pinia (store management)
- OpenRegister API (backend data layer)
