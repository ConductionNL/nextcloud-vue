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
