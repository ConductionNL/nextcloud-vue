/**
 * The active Nextcloud theme, read from the `data-theme-*` attributes on
 * `<body>` and, for "system default", from the OS colour-scheme preference.
 *
 * `window.matchMedia` is guarded rather than assumed. It is absent in jsdom
 * and in any host that has not implemented it, and an unguarded call there
 * THROWS DURING RENDER — `useCurrentTheme()` reaches this from a computed, so
 * the exception surfaces as a component that will not mount, nowhere near the
 * theme. `CnFlowDetail.prefersReducedMotion` already guards its own
 * matchMedia call the same way; these two were the ones that did not.
 *
 * Without matchMedia the OS preference is simply unknowable, so "system
 * default" resolves to the same 'light' this function already returns when no
 * theme attribute is set at all.
 *
 * @return {'dark'|'light'} The active theme.
 */
export function getTheme() {
	if (document.body.hasAttribute('data-theme-dark')) {
		return 'dark'
	}
	if (document.body.hasAttribute('data-theme-default')) {
		if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
			return 'light'
		}
		return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
	}
	return 'light'
}
