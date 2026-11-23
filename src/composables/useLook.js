// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2

import { computed, inject, unref } from 'vue'

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
 * Resolve the look a component is drawn in: its own `look` prop, else the
 * `cnLook` that CnAppRoot (or a page with `config.look`) provides, else
 * `nextcloud`.
 *
 * Call it from `setup(props)` of a component that declares a `look` prop with
 * no default. A dialog is teleported to `document.body`, outside CnAppRoot, so
 * no `.cn-look-board` rule reaches it: bind `lookClass` on the dialog's own
 * container and the board stylesheet applies after the teleport.
 *
 * @param {object} [props] The component's props; only `props.look` is read.
 * @return {{look: import('vue').ComputedRef<string>, isBoard: import('vue').ComputedRef<boolean>, lookClass: import('vue').ComputedRef<string>}}
 *   `look` is `board` or `nextcloud`; `lookClass` is `cn-look-board` in the
 *   board look and `''` otherwise (an app without the key gets no class).
 */
export function useLook(props) {
	const injected = inject('cnLook', 'nextcloud')
	const look = computed(() => {
		if (props && props.look) {
			return normalizeLook(props.look)
		}
		return normalizeLook(unref(injected))
	})
	const isBoard = computed(() => look.value === 'board')
	const lookClass = computed(() => (isBoard.value ? 'cn-look-board' : ''))
	return { look, isBoard, lookClass }
}
