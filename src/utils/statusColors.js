/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Status colours for widgets, per theme-aware Nextcloud token.
 *
 * `--color-success` / `--color-error` / `--color-warning` are background
 * tints, unreadable as text in dark mode. Their `-text` pairs are meant for
 * text ON those tints, so they are near-white in dark mode. For text or fills
 * on a normal background Nextcloud ships `--color-text-success`,
 * `--color-text-error` and the `--color-element-*` tokens, which stay green,
 * red and amber in both themes.
 *
 * Those tokens arrived in Nextcloud 32. Before that the plain tokens were the
 * strong colours and `-text` a darker shade of them, so each falls back to
 * whichever older token meant the same thing.
 *
 * @module utils/statusColors
 */

/** Text on a normal background. There is no `--color-text-warning`, so warning uses the element token. */
export const STATUS_TEXT_COLORS = Object.freeze({
	success: 'var(--color-text-success, var(--color-success-text))',
	warning: 'var(--color-element-warning, var(--color-warning-text))',
	error: 'var(--color-text-error, var(--color-error-text))',
})

/** Fills and icons on a normal background (bars, dots). */
export const STATUS_FILL_COLORS = Object.freeze({
	success: 'var(--color-element-success, var(--color-success))',
	warning: 'var(--color-element-warning, var(--color-warning))',
	error: 'var(--color-element-error, var(--color-error))',
})
