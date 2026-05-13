export function getTheme() {
	if (document.body.hasAttribute('data-theme-dark')) {
		return 'dark'
	}
	if (document.body.hasAttribute('data-theme-default')) {
		return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
	}
	return 'light'
}
