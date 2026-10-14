/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A switch's value map: what a switch reads as "on" and what it writes for on
 * and off. Without a map a switch is a boolean, as before. With `values:
 * { on, off }` it reads a field stored as `"1"`/`"0"` or `"true"`/`"false"`
 * (an app config flag) and writes those values back.
 *
 * @module utils/switchValues
 * @spec openspec/changes/screens-switch-value-map/specs/switch-rows/spec.md#requirement-a-switch-can-read-and-write-a-value-map
 */

/**
 * The value map of a switch, or null when it has none (a boolean switch).
 *
 * @param {unknown} values The declared `values`.
 * @return {{on: unknown, off: unknown}|null} The map.
 */
export function switchValueMap(values) {
	if (!values || typeof values !== 'object' || Array.isArray(values) || values.on === undefined) {
		return null
	}
	return { on: values.on, off: values.off === undefined ? null : values.off }
}

/**
 * Whether a stored value reads as "on". Without a map only `true` does; with
 * one, the `on` value does, compared as text so `1` and `"1"` are the same.
 *
 * @param {unknown} stored The stored value.
 * @param {unknown} values The declared `values`.
 * @return {boolean} True when the switch shows on.
 */
export function switchIsOn(stored, values) {
	const map = switchValueMap(values)
	if (!map) {
		return stored === true
	}
	if (stored === undefined || stored === null) {
		return false
	}
	return stored === map.on || String(stored) === String(map.on)
}

/**
 * The value a switch writes for a state.
 *
 * @param {boolean} on The switch state.
 * @param {unknown} values The declared `values`.
 * @return {unknown} `true`/`false` without a map, else the map's `on` / `off`.
 */
export function switchStoredValue(on, values) {
	const map = switchValueMap(values)
	if (!map) {
		return on === true
	}
	return on ? map.on : map.off
}
