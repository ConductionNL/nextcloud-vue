/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * `@conduction/nextcloud-vue/webpack` — build-config helpers for Nextcloud apps
 * that consume this library.
 *
 * THE PROBLEM
 * -----------
 * `@nextcloud/webpack-vue-config` hardcodes
 *
 *     output.publicPath = `/apps/${appName}/js/`
 *
 * That is correct only for an app installed under the server's own `apps/`
 * directory. Apps installed under `custom_apps/` — which is every app in a
 * docker-compose dev environment, and most production installs of a
 * non-bundled app — are served from a different prefix, and any app reachable
 * behind a subdirectory or a reverse proxy is too.
 *
 * The failure is worse than a 404. Nextcloud's front controller answers an
 * unmatched path with the web UI, so the browser requesting a lazy chunk at
 * the wrong prefix gets **HTTP 200 with `Content-Type: text/html`** — a full
 * HTML page where a JavaScript module was expected. What surfaces is:
 *
 *     Refused to execute script … because its MIME type ('text/html') is not
 *     executable, and strict MIME type checking is enabled
 *     ChunkLoadError: Loading chunk 42 failed
 *
 * A MIME refusal reads like a server misconfiguration, not a build-config bug,
 * and the network tab shows a green 200. Vue 2 builds hid this entirely by
 * emitting no async chunks at all, so it only appears once an app moves to
 * Vue 3 and code-splitting starts producing them.
 *
 * THE FIX
 * -------
 * `output.publicPath = 'auto'`. webpack then derives the prefix at runtime
 * from `document.currentScript.src` — the URL the entry bundle was actually
 * loaded from — so chunks resolve correctly under `apps/`, `custom_apps/`, a
 * subdirectory install, or behind a proxy, with no build-time knowledge of any
 * of them.
 *
 * USAGE
 * -----
 * ```js
 * // webpack.config.js
 * const { withPublicPath } = require('@conduction/nextcloud-vue/webpack')
 *
 * module.exports = withPublicPath(require('@nextcloud/webpack-vue-config'))
 * ```
 *
 * Or, if you already spread the upstream config:
 *
 * ```js
 * const { AUTO_PUBLIC_PATH } = require('@conduction/nextcloud-vue/webpack')
 *
 * module.exports = {
 *   ...base,
 *   output: { ...base.output, publicPath: AUTO_PUBLIC_PATH },
 * }
 * ```
 *
 * @module webpack
 */

'use strict'

/**
 * The value webpack understands as "derive the prefix at runtime".
 *
 * A string constant rather than a bare literal so a consumer can assert
 * against it in a config test instead of retyping `'auto'` and drifting.
 *
 * @type {string}
 */
const AUTO_PUBLIC_PATH = 'auto'

/**
 * Return a copy of a webpack config with a runtime-resolved `output.publicPath`.
 *
 * Does not mutate the input: `@nextcloud/webpack-vue-config` is a shared module
 * instance, and a config file that mutates it changes the object every other
 * `require` of it sees within the same build.
 *
 * Handles the array form (a multi-compiler config) as well as a single config
 * object.
 *
 * @param {object|object[]} config A webpack config, or an array of them.
 * @param {object} [options] Options.
 * @param {string} [options.publicPath] Override the value written. Defaults to
 *   {@link AUTO_PUBLIC_PATH}. Pass an explicit prefix only when you genuinely
 *   know it — a wrong literal is exactly the bug this helper exists to fix.
 *
 * @return {object|object[]} A new config (or array of configs) with
 *   `output.publicPath` set.
 *
 * @throws {TypeError} When `config` is not an object or array of objects.
 */
function withPublicPath(config, options = {}) {
	const publicPath = options.publicPath || AUTO_PUBLIC_PATH

	if (Array.isArray(config)) {
		return config.map((entry) => withPublicPath(entry, options))
	}

	if (config === null || typeof config !== 'object') {
		throw new TypeError('withPublicPath() expects a webpack config object or an array of them, got '
			+ (config === null ? 'null' : typeof config))
	}

	return {
		...config,
		output: {
			...(config.output || {}),
			publicPath,
		},
	}
}

/**
 * The `appVersion` define, resolved in the browser from the INSTALLED app.
 *
 * THE PROBLEM
 * -----------
 * `@nextcloud/vue` prints `<app name> <appVersion>` in the footer of every
 * NcAppSettingsDialog, and reads `appVersion` as a global the app's webpack
 * config defines. Apps defined it from `package.json` (a `0.1.0` nobody bumps,
 * so pipelinq read "pipelinq 0.1.0") or from `appinfo/info.xml` at build time.
 * The second is still wrong on every release: the release workflow writes the
 * release version into `info.xml` after the bundle is built, so dossiq
 * 0.4.48-beta said "dossiq 0.4.47-unstable". A build cannot know the version
 * it will be installed as.
 *
 * THE FIX
 * -------
 * Define `appVersion` as an EXPRESSION, not a literal. It runs once in the
 * browser and reads the app's `version` initial state, which the app's page
 * controller provides from what Nextcloud has installed
 * (`IAppConfig::getValueString($appId, 'installed_version')`). It reads the
 * same hidden input `@nextcloud/initial-state` `loadState()` reads; it cannot
 * import that package because a define is pasted into every module as code.
 * When the state is missing (a page that does not provide it, a test, a
 * worker without a document) it falls back to the build-time version.
 *
 * USAGE
 * -----
 * ```js
 * // webpack.config.js
 * const { appVersionDefine } = require('@conduction/nextcloud-vue/webpack')
 * new webpack.DefinePlugin({ appVersion: appVersionDefine('dossiq', readAppVersion()) })
 * ```
 * ```php
 * // the controller that renders the app's page
 * $this->initialState->provideInitialState('version', $this->appConfig->getValueString('dossiq', 'installed_version', ''));
 * ```
 *
 * @param {string} appId The app id, as used for its initial state.
 * @param {string} [fallback] The version to show when no initial state is
 *   present, normally the build-time `info.xml` version.
 * @param {object} [options] Options.
 * @param {string} [options.key] The initial-state key. Defaults to `version`.
 *
 * @return {string} A JavaScript expression for `webpack.DefinePlugin`.
 *
 * @throws {TypeError} When `appId` is empty.
 *
 * @spec openspec/changes/notification-rule-labels-and-runtime-version/specs/notification-preferences/spec.md
 */
function appVersionDefine(appId, fallback = '', options = {}) {
	const id = String(appId || '').trim()
	if (id === '') {
		throw new TypeError('appVersionDefine() needs the app id whose installed version it reads')
	}
	const key = String(options.key || 'version')
	const elementId = JSON.stringify('initial-state-' + id + '-' + key)
	const fallbackLiteral = JSON.stringify(String(fallback ?? ''))
	return '(function () {'
		+ ' try {'
		+ ' var el = typeof document !== "undefined" && document.getElementById(' + elementId + ');'
		+ ' if (el && el.value) {'
		+ ' var v = JSON.parse(atob(el.value));'
		+ ' if (typeof v === "string" && v !== "") { return v; }'
		+ ' }'
		+ ' } catch (e) {}'
		+ ' return ' + fallbackLiteral + ';'
		+ ' })()'
}

module.exports = {
	AUTO_PUBLIC_PATH,
	appVersionDefine,
	withPublicPath,
}
