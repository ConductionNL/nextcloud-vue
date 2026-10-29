/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Keys that reach an object's prototype when used as a property name.
 */

/**
 * Whether writing under this key would reach a prototype instead of an own
 * property (`__proto__`, `constructor`, `prototype`).
 *
 * @param {unknown} key A property name, path segment or cell name.
 * @return {boolean} True for a key an editor must not write under.
 */
export function isPrototypeKey(key) {
	return key === '__proto__' || key === 'constructor' || key === 'prototype'
}
