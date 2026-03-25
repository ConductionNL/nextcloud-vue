---
sidebar_position: 4
---

# Settings Page Layout

The admin configuration page for linking the app to OpenRegister and managing app-level settings.

![Settings page showing collapsible sections for mapping and version info](/img/screenshots/cn-settings-section.png)

## Anatomy

```
+-------------------------------------------------------------------+
|  AppSettings Heading + doc link                                   |
|                                                                   |
|  +------------------------------------------------------------+   |
|  |  Section Title          [Status Badge]  [Action Button]   |   |  ← CnSettingsSection
|  |  Section description                                      |   |
|  |  --------------------------------------------------------  |   |
|  |  <slot>                                                   |   |
|  |    CnRegisterMapping / CnVersionInfoCard / custom content  |   |
|  |  </slot>                                                  |   |
|  +------------------------------------------------------------+   |
|                                                                   |
|  +------------------------------------------------------------+   |
|  |  Another Section        [Save]                            |   |
|  |  ...                                                      |   |
|  +------------------------------------------------------------+   |
+-------------------------------------------------------------------+
```

## Components

### CnSettingsSection

The primary wrapper for any settings block. Provides:
- **Section heading** with optional external doc link
- **Action buttons** (save, re-import, custom) in the top-right header bar
- **Status badge** (e.g. "Up to date", "Error") next to actions
- **Loading spinner** while fetching
- **Retry on error** via `@retry` event
- **Collapsible** slot content

![CnSettingsSection showing heading, Up to date badge, and Re-import configuration button](/img/screenshots/cn-settings-section.png)

```vue
<CnSettingsSection
  title="Register Configuration"
  description="Map object types to OpenRegister registers and schemas"
  :loading="loading"
  :saving="saving"
  @save="save"
  @retry="load">
  <!-- slot content -->
</CnSettingsSection>
```

### CnVersionInfoCard

Shows current app version and Nextcloud/PHP compatibility info inside a CnSettingsSection.

![CnVersionInfoCard showing Application Information card with name and version](/img/screenshots/cn-version-info-card.png)

```vue
<CnSettingsSection title="Version Information" :actions="[{ label: 'Re-import', icon: RefreshIcon }]">
  <CnVersionInfoCard
    app-name="Pipelinq"
    :version="appVersion"
    nc-version="32+"
    php-version="8.1+" />
</CnSettingsSection>
```

### CnRegisterMapping

![Register mapping dropdowns for source, register, and schema per entity type](/img/screenshots/cn-register-mapping.png)

Lets admins configure which OpenRegister source, register, and schema each entity type uses. Always wrap inside a CnSettingsSection with a Save button.

## Full Usage

```vue
<template>
  <div class="settings-page">
    <h2>{{ t('myapp', 'Settings') }}</h2>

    <CnSettingsSection
      title="Version Information"
      description="Current installation info">
      <CnVersionInfoCard
        app-name="MyApp"
        :version="appVersion"
        nc-version="32+"
        php-version="8.1+" />
    </CnSettingsSection>

    <CnSettingsSection
      title="Register Configuration"
      description="Map object types to OpenRegister registers and schemas"
      :loading="loading"
      :saving="saving"
      @save="saveMappings"
      @retry="loadMappings">
      <CnRegisterMapping
        :object-types="settings.objectTypes"
        :registers="registers"
        :schemas="schemas"
        :sources="sources"
        @save="onSaveMappings"
        @refresh="loadRegisters" />
    </CnSettingsSection>
  </div>
</template>
```
