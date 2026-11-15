## ADDED Requirements

### Requirement: A manifest app boots in one call

`mountCnApp` SHALL mount CnAppRoot (or the given root) with the manifest, the registry, the page types and the app id,
after registering the given icons and the library's translations and installing the given plugins and the router.

#### Scenario: larpinq boots on CnAppRoot
- **WHEN** larpinq's `main.js` calls `mountCnApp('#content', { appId: 'larpinq', manifest, registry, vueRouter })`
- **THEN** CnAppRoot renders the manifest's pages with no other boot code

### Requirement: The router comes from the manifest

`routesFromManifest` SHALL give one route per page, named by its id, rendered by CnPageRenderer, and a catch-all
redirect. `appRouterBase` SHALL keep the form of the app path the reader arrived on.

#### Scenario: a deep link through index.php
- **GIVEN** a reader opens `/index.php/apps/larpinq/characters/1`
- **THEN** the router base is `/index.php/apps/larpinq` and the Character page opens
