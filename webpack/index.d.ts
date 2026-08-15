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
 */
export function withPublicPath<T extends object | object[]>(config: T, options?: CnPublicPathOptions): T
