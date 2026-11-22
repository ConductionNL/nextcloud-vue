/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnChartWidget draws its ApexCharts chart inside a shadow root.
 *
 * Every ApexCharts update clears and redraws the whole SVG, and svg.js reads
 * the computed font size of each label it writes, which forces a style
 * recalculation per label. In the light DOM each of those recalculations also
 * re-checks the page's `:has()` rules (the board look carries hundreds), and a
 * filter step on a full dashboard paid seconds for it. Document rules do not
 * reach into a shadow tree, so there a recalculation costs what the chart's
 * own few rules cost. Custom properties, fonts and colour still inherit
 * through the boundary, so the Nextcloud and NL Design tokens apply as before.
 *
 * Because document rules do not reach in, the rules that style ApexCharts'
 * own markup live here, applied to each chart's shadow root. ApexCharts finds
 * the shadow root itself and puts its own stylesheet in it.
 */

/** The class of the element ApexCharts is mounted in, inside the shadow root. */
export const CHART_SHADOW_CLASS = 'cn-chart-widget__chart'

/**
 * The rules for ApexCharts' markup, scoped to {@link CHART_SHADOW_CLASS}.
 *
 * ApexCharts' HTML chrome (the hover tooltip, the crosshair axis tooltips and
 * the toolbar menu) is styled by its own stylesheet with hardcoded hex values,
 * which in dark mode left a white tooltip under near-white text. These rules
 * restyle it with tokens, so one rule set is right in light, dark,
 * high-contrast and custom themes. Both tooltip theme classes are listed so an
 * `options.tooltip.theme` override cannot fall back onto a hardcoded palette.
 * Each rule carries one more class than the ApexCharts rule it replaces, so it
 * wins whatever the order of the two stylesheets.
 *
 * @type {string}
 */
export const CHART_SHADOW_CSS = `
.${CHART_SHADOW_CLASS} {
	width: 100%;
	height: 100%;
}

/* apexcharts writes an inline width onto its wrapper from its measured
   minimum; cap the painted box at the container. */
.${CHART_SHADOW_CLASS} .apexcharts-canvas,
.${CHART_SHADOW_CLASS} .apexcharts-canvas svg {
	max-width: 100%;
}

/* As an inline box the SVG would sit on a line and add its descender space. */
.${CHART_SHADOW_CLASS} .apexcharts-canvas svg {
	display: block;
}

.${CHART_SHADOW_CLASS} .apexcharts-tooltip.apexcharts-theme-light,
.${CHART_SHADOW_CLASS} .apexcharts-tooltip.apexcharts-theme-dark {
	background: var(--color-main-background);
	border: 1px solid var(--color-border);
	color: var(--color-main-text);
	box-shadow: 0 1px 5px var(--color-box-shadow, rgba(0, 0, 0, 0.2));
}

/* The date or category header row of the hover tooltip. */
.${CHART_SHADOW_CLASS} .apexcharts-tooltip.apexcharts-theme-light .apexcharts-tooltip-title,
.${CHART_SHADOW_CLASS} .apexcharts-tooltip.apexcharts-theme-dark .apexcharts-tooltip-title {
	background: var(--color-background-hover);
	border-bottom: 1px solid var(--color-border);
	color: var(--color-main-text);
}

/* Crosshair axis tooltips: apexcharts puts its light palette on the base
   class, so the base rule is replaced, not only the theme variants. */
.${CHART_SHADOW_CLASS} .apexcharts-xaxistooltip,
.${CHART_SHADOW_CLASS} .apexcharts-yaxistooltip {
	background: var(--color-main-background);
	border: 1px solid var(--color-border);
	color: var(--color-main-text);
}

/* Their arrows are two triangles: ::before the border edge, ::after the fill. */
.${CHART_SHADOW_CLASS} .apexcharts-xaxistooltip-bottom::after,
.${CHART_SHADOW_CLASS} .apexcharts-xaxistooltip-top::after {
	border-bottom-color: var(--color-main-background);
	border-top-color: var(--color-main-background);
}

.${CHART_SHADOW_CLASS} .apexcharts-xaxistooltip-bottom::before,
.${CHART_SHADOW_CLASS} .apexcharts-xaxistooltip-top::before {
	border-bottom-color: var(--color-border);
	border-top-color: var(--color-border);
}

.${CHART_SHADOW_CLASS} .apexcharts-yaxistooltip-left::after,
.${CHART_SHADOW_CLASS} .apexcharts-yaxistooltip-right::after {
	border-left-color: var(--color-main-background);
	border-right-color: var(--color-main-background);
}

.${CHART_SHADOW_CLASS} .apexcharts-yaxistooltip-left::before,
.${CHART_SHADOW_CLASS} .apexcharts-yaxistooltip-right::before {
	border-left-color: var(--color-border);
	border-right-color: var(--color-border);
}

/* Toolbar menu (only with toolbar: true): a hardcoded #fff panel otherwise. */
.${CHART_SHADOW_CLASS} .apexcharts-menu {
	background: var(--color-main-background);
	border: 1px solid var(--color-border);
	color: var(--color-main-text);
}

.${CHART_SHADOW_CLASS} .apexcharts-menu .apexcharts-menu-item:hover {
	background: var(--color-background-hover);
}

/* Toolbar icons: one selector per icon class, matching apexcharts' own list,
   to clear its (0,3,1) hover rules. */
.${CHART_SHADOW_CLASS} .apexcharts-toolbar .apexcharts-menu-icon svg,
.${CHART_SHADOW_CLASS} .apexcharts-toolbar .apexcharts-reset-icon svg,
.${CHART_SHADOW_CLASS} .apexcharts-toolbar .apexcharts-selection-icon svg,
.${CHART_SHADOW_CLASS} .apexcharts-toolbar .apexcharts-zoom-icon svg,
.${CHART_SHADOW_CLASS} .apexcharts-toolbar .apexcharts-zoomin-icon svg,
.${CHART_SHADOW_CLASS} .apexcharts-toolbar .apexcharts-zoomout-icon svg {
	fill: var(--color-text-maxcontrast);
}

.${CHART_SHADOW_CLASS} .apexcharts-toolbar .apexcharts-menu-icon:hover svg,
.${CHART_SHADOW_CLASS} .apexcharts-toolbar .apexcharts-reset-icon:hover svg,
.${CHART_SHADOW_CLASS} .apexcharts-toolbar .apexcharts-selection-icon:hover svg,
.${CHART_SHADOW_CLASS} .apexcharts-toolbar .apexcharts-zoom-icon:hover svg,
.${CHART_SHADOW_CLASS} .apexcharts-toolbar .apexcharts-zoomin-icon:hover svg,
.${CHART_SHADOW_CLASS} .apexcharts-toolbar .apexcharts-zoomout-icon:hover svg {
	fill: var(--color-main-text);
}
`

let sharedSheet = null

/**
 * The rules as one constructed stylesheet shared by every chart, or null where
 * the browser cannot adopt stylesheets.
 *
 * @return {CSSStyleSheet|null} The sheet.
 */
function adoptableSheet() {
	if (sharedSheet !== null) {
		return sharedSheet
	}
	try {
		const sheet = new CSSStyleSheet()
		sheet.replaceSync(CHART_SHADOW_CSS)
		sharedSheet = sheet
	} catch {
		sharedSheet = false
	}
	return sharedSheet || null
}

/**
 * A new, still detached element to mount ApexCharts in.
 *
 * @return {HTMLElement|null} The container, or null outside a browser.
 */
export function createChartContainer() {
	if (typeof document === 'undefined') {
		return null
	}
	const container = document.createElement('div')
	container.className = CHART_SHADOW_CLASS
	return container
}

/**
 * Put the chart container in a shadow root of `host` that also holds the
 * chart rules. Where the element cannot take a shadow root the container goes
 * in the element itself, with the rules added to the document once.
 *
 * @param {HTMLElement} host The element the chart is drawn in.
 * @param {HTMLElement} container The container from {@link createChartContainer}.
 * @return {void}
 */
export function attachChartShadow(host, container) {
	if (!host || !container) {
		return
	}
	if (typeof host.attachShadow !== 'function') {
		addDocumentRules()
		if (container.parentNode !== host) {
			host.appendChild(container)
		}
		return
	}
	const root = host.shadowRoot || host.attachShadow({ mode: 'open' })
	if (container.parentNode === root) {
		return
	}
	const sheet = adoptableSheet()
	if (sheet && 'adoptedStyleSheets' in root) {
		if (!root.adoptedStyleSheets.includes(sheet)) {
			root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet]
		}
	} else if (!root.querySelector('style[data-cn-chart]')) {
		const style = document.createElement('style')
		style.setAttribute('data-cn-chart', '')
		style.textContent = CHART_SHADOW_CSS
		root.appendChild(style)
	}
	root.appendChild(container)
}

/**
 * Add the chart rules to the document head, once.
 *
 * @return {void}
 */
function addDocumentRules() {
	if (document.querySelector('style[data-cn-chart]')) {
		return
	}
	const style = document.createElement('style')
	style.setAttribute('data-cn-chart', '')
	style.textContent = CHART_SHADOW_CSS
	document.head.appendChild(style)
}
