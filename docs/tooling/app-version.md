---
id: app-version
title: Installed app version
---

# The installed version in the settings footer (`@conduction/nextcloud-vue/webpack`)

```js
// webpack.config.js
const { appVersionDefine } = require('@conduction/nextcloud-vue/webpack')

new webpack.DefinePlugin({
	appVersion: appVersionDefine('myapp', readVersionFromInfoXml()),
})
```

```php
// the controller that renders the app page
$this->initialState->provideInitialState(
	'version',
	$this->appConfig->getValueString('myapp', 'installed_version', ''),
);
```

`@nextcloud/vue` prints the app name and the `appVersion` global at the foot of
every settings dialog. A version defined at build time is wrong on a release:
the release workflow writes the release version into `appinfo/info.xml` after
the bundle is built, so a 0.4.48-beta install read 0.4.47-unstable.

`appVersionDefine()` returns an expression instead of a literal. In the browser
it reads the page's `version` initial state, the version Nextcloud installed.
When the page provides none it returns the version you passed as fallback.
