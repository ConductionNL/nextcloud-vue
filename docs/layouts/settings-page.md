---
sidebar_position: 4
---

# Settings Page Layout

The admin configuration page for linking the app to OpenRegister and managing app-level settings.

![Settings page showing collapsible sections for mapping and version info](/img/screenshots/cn-settings-section.png)

## Anatomy

```
+-------------------------------------------------------------------+
|  Settings                                                         |
|                                                                   |
|  +------------------------------------------------------------+   |
|  |  OpenRegister Mapping                         [Save] [^]   |   |
|  |  --------------------------------------------------------  |   |
|  |  Source:    [ openregister                            v ]  |   |
|  |  Register:  [ Pipelinq                                v ]  |   |
|  |  Client:    [ Client Schema                           v ]  |   |
|  |  Contact:   [ Contact Schema                          v ]  |   |
|  +------------------------------------------------------------+   |
|                                                                   |
|  +------------------------------------------------------------+   |
|  |  App Version                                          [^]  |   |
|  |  --------------------------------------------------------  |   |
|  |  Version:    1.5.0     Nextcloud: 32+    PHP: 8.1+        |   |
|  +------------------------------------------------------------+   |
+-------------------------------------------------------------------+
```

## Components

### CnSettingsSection

Collapsible section with title, loading spinner, save button, and retry on error. Wrap any settings content inside it.

### CnRegisterMapping

![Register mapping dropdowns for source, register, and schema per entity type](/img/screenshots/cn-register-mapping.png)

Lets admins configure which OpenRegister source, register, and schema each entity type uses. Fetches available options from the OpenRegister API.

### CnVersionInfoCard

Shows current app version and Nextcloud/PHP compatibility.

## Usage

```vue
<template>
  <div class="settings-page">
    <h2>Settings</h2>

    <CnSettingsSection
      title="OpenRegister Mapping"
      :loading="mappingLoading"
      :saving="mappingSaving"
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

    <CnSettingsSection title="App Version">
      <CnVersionInfoCard
        app-name="MyApp"
        :version="appVersion"
        nc-version="32+"
        php-version="8.1+" />
    </CnSettingsSection>
  </div>
</template>
```
