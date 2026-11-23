/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The heading level a widget title takes, handed down by provide/inject.
 * A page provides the level just under its own title; a titled widget or a
 * section heading provides one deeper for what it contains. The value is a
 * number or a function returning one, so a host can follow a reactive look.
 */

/** Injection key for the heading level of the next widget title down. */
export const HEADING_LEVEL = 'cnHeadingLevel'

/** The level a widget title takes when no host says otherwise. */
export const DEFAULT_HEADING_LEVEL = 3

/**
 * Read a provided heading level.
 *
 * @param {number|(() => number)|null|undefined} provided The injected value.
 * @return {number} A level from 2 to 6.
 */
export function resolveHeadingLevel(provided) {
	const value = Number(typeof provided === 'function' ? provided() : provided)
	if (!Number.isFinite(value)) {
		return DEFAULT_HEADING_LEVEL
	}
	return Math.min(6, Math.max(2, Math.round(value)))
}

/**
 * The tag for a heading level.
 *
 * @param {number|(() => number)|null|undefined} provided The injected value.
 * @return {string} `h2` to `h6`.
 */
export function headingTag(provided) {
	return `h${resolveHeadingLevel(provided)}`
}
