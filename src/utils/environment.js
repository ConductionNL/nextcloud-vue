/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Which environment an app screen belongs to (OTAP), so acceptance is not
 * mistaken for production.
 *
 * @module utils/environment
 * @spec openspec/changes/environment-banner/tasks.md#task-2
 */

/** The environments an instance can declare. */
export const ENVIRONMENTS = Object.freeze(['development', 'test', 'acceptance', 'production'])

/** The environments that are named on screen; production shows nothing. */
export const MARKED_ENVIRONMENTS = Object.freeze(['development', 'test', 'acceptance'])

/** The title prefix for each marked environment. */
export const ENVIRONMENT_TITLE_PREFIX = Object.freeze({ development: '[DEV]', test: '[TEST]', acceptance: '[ACC]' })

/**
 * A declared environment, or '' when the value is not one.
 *
 * @param {unknown} value A prop or organisation field.
 * @return {string} One of {@link ENVIRONMENTS}, or ''.
 */
export function normaliseEnvironment(value) {
	const name = typeof value === 'string' ? value.trim().toLowerCase() : ''
	return ENVIRONMENTS.includes(name) ? name : ''
}

/**
 * The environment to show: the app's own setting when it is a declared
 * environment, else the organisation's, else none. Production, an unknown
 * value or no value all come out as a value that shows nothing.
 *
 * @param {unknown} fromApp The `environment` prop.
 * @param {unknown} fromOrganisation The active organisation's `environment`.
 * @return {string} A declared environment, or '' for none.
 */
export function resolveEnvironment(fromApp, fromOrganisation) {
	return normaliseEnvironment(fromApp) || normaliseEnvironment(fromOrganisation)
}
