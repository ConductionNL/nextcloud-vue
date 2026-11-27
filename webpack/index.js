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

const path = require('path')

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

/**
 * Whether a `module.rules[].use` entry is css-loader.
 *
 * @param {string|object} entry A loader entry: a name or `{ loader, options }`.
 * @return {boolean}
 */
function isCssLoader(entry) {
	const name = typeof entry === 'string' ? entry : (entry && entry.loader)
	return typeof name === 'string' && /(^|[\\/])css-loader([\\/]|$)/.test(name)
}

/**
 * Set `sourceMap: false` on a css-loader entry.
 *
 * @param {string|object} entry A css-loader entry.
 * @return {object} The entry as `{ loader, options }`.
 */
function cssLoaderWithoutMaps(entry) {
	const base = typeof entry === 'string' ? { loader: entry } : entry
	const options = base.options && typeof base.options === 'object' ? base.options : {}
	return { ...base, options: { ...options, sourceMap: false } }
}

/**
 * Turn css-loader's source maps off in one rule (and its `oneOf` / `rules`).
 *
 * @param {object} rule A webpack rule.
 * @return {object} A new rule.
 */
function withoutCssMaps(rule) {
	if (!rule || typeof rule !== 'object') {
		return rule
	}
	const out = { ...rule }
	if (Array.isArray(out.oneOf)) {
		out.oneOf = out.oneOf.map(withoutCssMaps)
	}
	if (Array.isArray(out.rules)) {
		out.rules = out.rules.map(withoutCssMaps)
	}
	if (isCssLoader(out.loader)) {
		const options = out.options && typeof out.options === 'object' ? out.options : {}
		out.options = { ...options, sourceMap: false }
	}
	const use = Array.isArray(out.use) ? out.use : (out.use && typeof out.use !== 'function' ? [out.use] : null)
	if (use && use.some(isCssLoader)) {
		out.use = use.map((entry) => (isCssLoader(entry) ? cssLoaderWithoutMaps(entry) : entry))
	}
	return out
}

// @nextcloud/vue's index: imports and re-exports only, safe to skip.
const NEXTCLOUD_VUE_INDEX_RULE = Object.freeze({
	test: /[\\/]node_modules[\\/]@nextcloud[\\/]vue[\\/]dist[\\/]index\.mjs$/,
	sideEffects: false,
})

// @nextcloud/vue's chunks that read the body's custom properties with
// getComputedStyle() per component: read them once per page instead.
const NEXTCLOUD_VUE_BODY_STYLE_RULE = Object.freeze({
	test: /[\\/]node_modules[\\/]@nextcloud[\\/]vue[\\/]dist[\\/]chunks[\\/](NcSelect|NcSelectUsers|NcProgressBar)(-[\w-]+)?\.mjs$/,
	use: Object.freeze([path.join(__dirname, 'body-style-once-loader.js')]),
})

/**
 * Wrap a `splitChunks` `chunks` function so it also requires an initial
 * chunk: the app's own filter stays, async chunks are never taken.
 *
 * @param {function(object): boolean} select The app's chunk filter.
 * @return {function(object): boolean} The narrowed filter.
 */
function initialOnly(select) {
	const narrowed = (chunk) => Boolean(chunk && typeof chunk.canBeInitial === 'function' && chunk.canBeInitial()) && Boolean(select(chunk))
	narrowed.cnInitialOnly = true
	return select.cnInitialOnly ? select : narrowed
}

/**
 * Return a copy of a webpack config that keeps the library's lazy chunks lazy
 * and stops css-loader writing source maps into the JavaScript.
 *
 * THE PROBLEM
 * -----------
 * Measured on opencatalogi (25 Nov 2026, prod build): its shared chunk was
 * 15.3 MB and its main bundle 9.0 MB, minified. Two build settings did most
 * of that:
 *
 * 1. css-loader follows `devtool`, so with `devtool: 'source-map'` it embeds
 *    each stylesheet's map, `sourcesContent` included, in the JavaScript
 *    module style-loader runs. The library's 1.4 MB stylesheet shipped twice.
 * 2. A named `splitChunks` cache group with `chunks: 'all'` (the usual
 *    "shared nc-vue" group) also takes the modules of async chunks. Everything
 *    the library loads on demand (icon packs, charts, the code editor, maps,
 *    flow diagrams) moved into the chunk every page loads.
 *
 * THE FIX
 * -------
 * - every css-loader gets `sourceMap: false` (JavaScript maps are untouched);
 * - every cache group that would take async chunks (`chunks: 'all'`, set or
 *   inherited) gets `chunks: 'initial'`, so modules only an `import()` needs
 *   stay in their own chunk. A `chunks` FUNCTION (e.g. "every entry but
 *   one") keeps its filter and also requires an initial chunk: portaliq's
 *   filter of that kind put the library's async chunks into its shared chunk
 *   (14.95 -> 3.03 MB once narrowed, 27 Nov 2026). A group that sets
 *   `chunks: 'async'` is left alone.
 * - `@nextcloud/vue`'s index module is marked free of side effects. That
 *   package declares no `sideEffects`, so one `import { NcButton } from
 *   '@nextcloud/vue'` kept every component it lists, with emoji-mart, the date
 *   picker and the markdown stack: 2.2 MB minified for one button. The index
 *   only imports and re-exports, so webpack can link each name to its own
 *   module; each component's own modules and CSS keep their side effects.
 * - `@nextcloud/vue`'s NcSelect, NcSelectUsers and NcProgressBar read the
 *   body's `--default-clickable-area` / `--default-grid-baseline` once per
 *   page (`body-style-once-loader.js`). NcSelect read both in every setup():
 *   each read forces a full style recalculation during the first render,
 *   ~73 ms on a page with five selects.
 *
 * USAGE
 * -----
 * ```js
 * const { withLeanBundles } = require('@conduction/nextcloud-vue/webpack')
 * module.exports = withLeanBundles(webpackConfig)
 * ```
 * Apply it last, after the app has set its own rules and `optimization`.
 *
 * Does not mutate the input. Accepts the multi-compiler array form.
 *
 * @param {object|object[]} config A webpack config, or an array of them.
 * @return {object|object[]} A new config (or array of configs).
 *
 * @throws {TypeError} When `config` is not an object or array of objects.
 */
function withLeanBundles(config) {
	if (Array.isArray(config)) {
		return config.map((entry) => withLeanBundles(entry))
	}
	if (config === null || typeof config !== 'object') {
		throw new TypeError('withLeanBundles() expects a webpack config object or an array of them, got '
			+ (config === null ? 'null' : typeof config))
	}

	const out = { ...config }
	const rules = config.module && Array.isArray(config.module.rules) ? config.module.rules.map(withoutCssMaps) : []
	out.module = { ...(config.module || {}), rules: [...rules, { ...NEXTCLOUD_VUE_INDEX_RULE }, { ...NEXTCLOUD_VUE_BODY_STYLE_RULE, use: [...NEXTCLOUD_VUE_BODY_STYLE_RULE.use] }] }

	const splitChunks = config.optimization && config.optimization.splitChunks
	if (splitChunks && typeof splitChunks === 'object') {
		const topAll = splitChunks.chunks === 'all'
		const narrowed = { ...splitChunks }
		if (topAll) {
			narrowed.chunks = 'initial'
		} else if (typeof splitChunks.chunks === 'function') {
			narrowed.chunks = initialOnly(splitChunks.chunks)
		}
		if (splitChunks.cacheGroups && typeof splitChunks.cacheGroups === 'object') {
			narrowed.cacheGroups = {}
			for (const [key, group] of Object.entries(splitChunks.cacheGroups)) {
				const isGroup = group !== null && typeof group === 'object' && !(group instanceof RegExp)
				const takesAll = isGroup && (group.chunks === 'all' || (group.chunks === undefined && topAll))
				if (takesAll) {
					narrowed.cacheGroups[key] = { ...group, chunks: 'initial' }
				} else if (isGroup && typeof group.chunks === 'function') {
					narrowed.cacheGroups[key] = { ...group, chunks: initialOnly(group.chunks) }
				} else {
					narrowed.cacheGroups[key] = group
				}
			}
		}
		out.optimization = { ...config.optimization, splitChunks: narrowed }
	}
	return out
}

/**
 * The library stylesheet file a webpack app should link: the file
 * `css/index.css` `@import`s (the sheet without the board-look block), or
 * `css/index.css` itself when it imports nothing.
 *
 * @param {function(string): string} [resolve] Resolves a module path (default: `require.resolve`).
 * @param {function(string): string} [read] Reads a file as UTF-8 (default: `fs.readFileSync`).
 * @return {string} The absolute path of the stylesheet.
 */
function libraryStylesheetSource(resolve = require.resolve, read = (file) => require('fs').readFileSync(file, 'utf8')) {
	const entry = resolve('@conduction/nextcloud-vue/css/index.css')
	const imported = /@import\s+(?:url\()?['"]([^'"]+)['"]/.exec(read(entry))
	return imported ? path.resolve(path.dirname(entry), imported[1]) : entry
}

/**
 * A webpack plugin that copies the library stylesheet next to the app's own
 * CSS, so the page LINKS it instead of a bundle inserting it as text.
 *
 * THE PROBLEM
 * -----------
 * `import '@conduction/nextcloud-vue/css/index.css'` in an entry makes
 * style-loader carry the ~1.1 MB sheet as a string in the JavaScript and
 * insert it on every page load: the bundle is that much bigger, and the browser
 * parses the CSS again on each load. A linked stylesheet stays parsed in the
 * browser's cache between loads. Measured on the sandbox reference stack
 * (27 Nov 2026): launchpad Workspace 884/848/854 -> 828/831/829 ms,
 * opencatalogi Search 1355/1478 -> 1260/1243 ms, pipelinq Sales
 * ~-150 ms, OpenRegister Registers first content 1420/1400 -> 1288/1296 ms.
 *
 * THE FIX
 * -------
 * 1. Add this plugin; it writes `css/nextcloud-vue.css` (git-ignore it).
 * 2. Link it on every page whose entry used to import the sheet, BEFORE the
 *    app's own style: `Util::addStyle('<appid>', 'nextcloud-vue')`.
 * 3. Drop `import '@conduction/nextcloud-vue/css/index.css'` from those entries.
 *
 * USAGE
 * -----
 * ```js
 * const { LibraryStylesheetCopy } = require('@conduction/nextcloud-vue/webpack')
 * webpackConfig.plugins.push(new LibraryStylesheetCopy())
 * ```
 *
 * @param {object} [options] Options.
 * @param {string} [options.to] Where to write, relative to the webpack
 *   `context` (the app root). Defaults to `css/nextcloud-vue.css`.
 * @param {string} [options.from] The stylesheet to copy. Defaults to
 *   {@link libraryStylesheetSource}().
 */
class LibraryStylesheetCopy {
	constructor(options = {}) {
		this.to = options.to || path.join('css', 'nextcloud-vue.css')
		this.from = options.from || null
	}

	apply(compiler) {
		compiler.hooks.afterEmit.tap('LibraryStylesheetCopy', () => {
			const fs = require('fs')
			const source = this.from || libraryStylesheetSource()
			const target = path.resolve(compiler.context || process.cwd(), this.to)
			fs.mkdirSync(path.dirname(target), { recursive: true })
			fs.copyFileSync(source, target)
		})
	}
}

module.exports = {
	AUTO_PUBLIC_PATH,
	LibraryStylesheetCopy,
	NEXTCLOUD_VUE_BODY_STYLE_RULE,
	NEXTCLOUD_VUE_INDEX_RULE,
	appVersionDefine,
	libraryStylesheetSource,
	withLeanBundles,
	withPublicPath,
}
