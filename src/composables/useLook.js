// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2

import { inject } from 'vue'

/**
 * The look names a component may be drawn in.
 *
 * @type {readonly string[]}
 */
export const LOOKS = Object.freeze(['nextcloud', 'board'])

/**
 * Normalise anything to a known look name; unknown values fall back to
 * `nextcloud`.
 *
 * @param {unknown} value The raw look.
 * @return {string} `board` or `nextcloud`.
 */
export function normalizeLook(value) {
	return value === 'board' ? 'board' : 'nextcloud'
}

/**
 * Resolve the look a component is drawn in: an explicit value, else the
 * `cnLook` that CnAppRoot provides, else `nextcloud`. Internal helper: the
 * public surface is the `cnLook` inject.
 *
 * @param {string} [explicit] An explicit look (a prop), when set.
 * @return {string} `board` or `nextcloud`.
 */
export function useLook(explicit) {
	if (explicit) {
		return normalizeLook(explicit)
	}
	return normalizeLook(inject('cnLook', 'nextcloud'))
}
