/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * useCurrentTheme — the active Nextcloud theme ('light' | 'dark') as a
 * REACTIVE value.
 *
 * `utils/getTheme.js` answers the same question once; this wraps it in a
 * reactive holder that tracks the two ways the answer changes at runtime:
 * the user flipping Nextcloud's theme (the `data-theme-*` attributes on
 * `<body>`) and the OS-level color-scheme preference changing while the
 * "system default" theme is selected. Consumers that render theme-variant
 * values (e.g. the folder-customization palette's light/dark hex pairs)
 * re-render on either without a reload.
 *
 * Watchers are installed lazily on first use and shared module-wide — one
 * MutationObserver per page, however many components consume the theme.
 */

import { computed, reactive } from 'vue'
import { getTheme } from '../utils/getTheme.js'

const state = reactive({ theme: null })

let initialized = false

/**
 * Install the shared watchers (once) and seed the state.
 *
 * SSR-safe: without a document the state stays 'light' and no watcher is
 * installed.
 *
 * @return {void}
 */
function init() {
	if (state.theme === null) {
		state.theme = typeof document === 'undefined' ? 'light' : getTheme()
	}
	if (initialized || typeof document === 'undefined') return
	initialized = true

	const refresh = () => {
		state.theme = getTheme()
	}

	const observer = new MutationObserver(refresh)
	observer.observe(document.body, {
		attributes: true,
		attributeFilter: ['data-theme-dark', 'data-theme-light', 'data-theme-default'],
	})

	const mq = window.matchMedia('(prefers-color-scheme: light)')
	if (typeof mq.addEventListener === 'function') {
		mq.addEventListener('change', refresh)
	} else if (typeof mq.addListener === 'function') {
		// Safari < 14 shipped only the deprecated listener API.
		mq.addListener(refresh)
	}
}

/**
 * The active theme as a reactive computed — the composition-API entry.
 *
 * @return {import('vue').ComputedRef<'dark'|'light'>} The active theme.
 */
export function useCurrentTheme() {
	init()
	return computed(() => state.theme)
}

/**
 * The active theme as a plain reactive READ — the options-API entry: call
 * it inside a computed/render and the component re-renders on change.
 *
 * @return {'dark'|'light'} The active theme.
 */
export function currentTheme() {
	init()
	return state.theme
}
