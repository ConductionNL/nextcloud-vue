import GeneratedRef from './_generated/CnLeafDependencySettings.md'

# CnLeafDependencySettings

An admin-settings section listing the Nextcloud apps this app can use that are missing or disabled, with an install/enable action for each.

It replaces the stack of orange notices `CnAppRoot` used to render at the top of every index page. Those stacked — an app declaring four optional leaves showed four cards above its own content, on every page load — and they addressed an audience, administrators, who were not the ones reading the index page. `CnAppRoot`'s `softDependencyNotices` prop still restores the old banners for one release, but is deprecated.

The two actionable states the banner distinguished are preserved: an app that is **not installed** offers *Install and enable*; one that is **installed but disabled** offers *Enable*.

## Mounting it

Mount it in the app's admin settings entry point. It resolves each app's status itself, so nothing but the declarations is needed:

```vue
<template>
  <CnLeafDependencySettings
    app-id="dossiq"
    :dependencies="manifest.dependencies"
    :is-admin="isAdmin"
    @installed="reload" />
</template>
```

`dependencies` takes the manifest's own array — bare app-id strings (treated as required) or `{ id, name, required }` objects. Inside a `CnAppRoot` the prop may be omitted and the injected manifest is used instead.

## What it renders

- Required dependencies first, then optional ones, each alphabetically.
- Nothing but a confirmation line when every dependency is installed and enabled — a section that went blank could not be told from one that failed to load.
- An "ask your administrator" line in place of the button when `is-admin` is false.

Installation goes through the shared `useAppInstaller` composable, which is the same admin-password-confirming path the old banner used.

<GeneratedRef />

## Headings and scope

| Prop | Type | Default | Description |
|---|---|---|---|
| `sectionName` | String | `t('Optional integrations')` | Pre-translated section heading. |
| `sectionDescription` | String | *(see source)* | Pre-translated section description shown under the heading. |
| `showResolved` | Boolean | `false` | Also list dependencies that are present and enabled. Off by default — a section about what is missing should be empty when nothing is. |
