# A manifest app boots on CnAppRoot in one call

## Why
Every manifest app repeats the same boot in `main.js`: routes from the manifest pages, a router base that survives both
`/apps/<id>` and `/index.php/apps/<id>`, icons, translations and a root that mounts CnAppRoot with the manifest and the
registry. larpinq's tier-4 graduation (`larpinq-manifest-tier-4` task 2.1) asks for `CnAppRoot` as the boot entry with
no bespoke setup left, which needs a library mount helper that supplies the router.

## What changes
`mountCnApp(target, { appId, manifest, registry, pageTypes, icons, router | vueRouter, plugins, rootComponent, rootProps })`,
`routesFromManifest(manifest, { component, fallback })` and `appRouterBase(appId)`, exported from the barrel. The library
takes vue-router's factories from the host instead of depending on vue-router.
