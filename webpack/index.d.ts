/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Types for `@conduction/nextcloud-vue/webpack`.
 */

/** The value webpack understands as "derive the prefix at runtime". */
export const AUTO_PUBLIC_PATH: string

export interface CnPublicPathOptions {
	/**
	 * Override the value written to `output.publicPath`. Defaults to
	 * {@link AUTO_PUBLIC_PATH}. Pass an explicit prefix only when you genuinely
	 * know it — a wrong literal is the bug this helper exists to fix.
	 */
	publicPath?: string
}

/**
 * Return a copy of a webpack config with a runtime-resolved
 * `output.publicPath`, fixing `ChunkLoadError` / MIME refusals for apps that
 * are not served from `/apps/<app>/js/`.
 *
 * Does not mutate the input. Accepts the multi-compiler array form.
 *
 * @param config The webpack configuration, or the multi-compiler array form.
 * @param options Where the public path is read from at runtime.
 */
export function withPublicPath<T extends object | object[]>(config: T, options?: CnPublicPathOptions): T

export interface CnAppVersionDefineOptions {
	/** The initial-state key the app's page provides its version under. Defaults to `version`. */
	key?: string
}

/**
 * A `webpack.DefinePlugin` expression for `appVersion` that reads the
 * installed app version from the page's initial state at runtime, falling
 * back to `fallback` (the build-time version) when the state is absent.
 *
 * @param appId The app id.
 * @param fallback The build-time version.
 * @param options Which initial-state key to read.
 */
export function appVersionDefine(appId: string, fallback?: string, options?: CnAppVersionDefineOptions): string

/**
 * Return a copy of a webpack config that turns css-loader source maps off
 * (they embed every stylesheet a second time in the JavaScript) and narrows
 * every `splitChunks` cache group that takes all chunks to `chunks: 'initial'`
 * and wraps every `chunks` function so it also requires an initial chunk
 * (so the library's lazy chunks stay lazy), and appends a rule marking
 * `@nextcloud/vue`'s index module free of side effects (so one Nc* import
 * does not bundle every component), and a rule that makes NcSelect read the
 * body's style tokens once per page instead of twice per select. Apply it last.
 *
 * Does not mutate the input. Accepts the multi-compiler array form.
 *
 * @param config The webpack configuration, or the multi-compiler array form.
 */
/** The rule withLeanBundles appends: `@nextcloud/vue`'s index has no side effects. */
export const NEXTCLOUD_VUE_INDEX_RULE: { readonly test: RegExp, readonly sideEffects: false }

/** The rule withLeanBundles appends: `@nextcloud/vue`'s NcSelect, NcSelectUsers and NcProgressBar read the body style tokens once per page. */
export const NEXTCLOUD_VUE_BODY_STYLE_RULE: { readonly test: RegExp, readonly use: readonly string[] }

export function withLeanBundles<T extends object | object[]>(config: T): T

export interface CnLibraryStylesheetCopyOptions {
	/** Where to write, relative to the webpack `context` (the app root). Defaults to `css/nextcloud-vue.css`. */
	to?: string
	/** The stylesheet to copy. Defaults to the file `css/index.css` imports. */
	from?: string
}

/** The absolute path of the library stylesheet a webpack app should link. */
export function libraryStylesheetSource(resolve?: (request: string) => string, read?: (file: string) => string): string

/**
 * A webpack plugin that copies the library stylesheet to `css/nextcloud-vue.css`
 * after emit, so the app links it (`Util::addStyle('<appid>', 'nextcloud-vue')`)
 * instead of a bundle inserting ~1.1 MB of CSS text on every page load.
 */
export class LibraryStylesheetCopy {
	constructor(options?: CnLibraryStylesheetCopyOptions)
	apply(compiler: { context?: string, hooks: { afterEmit: { tap(name: string, fn: () => void): void } } }): void
}
