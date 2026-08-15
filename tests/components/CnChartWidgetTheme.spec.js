/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Tests that CnChartWidget's apexcharts chrome follows the Nextcloud theme.
 *
 * The defect: the hover tooltip stayed a white box in dark mode while its text
 * inherited the near-white `--color-main-text` — white on white. Everything
 * apexcharts draws inside the SVG is themed through `mergedOptions`, but its
 * HTML chrome (hover tooltip, crosshair axis tooltips, toolbar menu) is styled
 * by a stylesheet apexcharts injects itself, with hardcoded hex values.
 *
 * The override lives in CSS, which jsdom does not apply, so these assertions
 * read the SFC's style block. That is the same shape as CnContextMenu's
 * popper-scoping test, and it is what catches the two ways this regresses:
 * someone re-fixing it with a literal colour (breaks the other theme again),
 * and someone dropping the compound selector that keeps each override ahead of
 * the apexcharts rule it replaces.
 */

import { readFileSync } from 'fs'
import { join } from 'path'

const SFC = readFileSync(join(__dirname, '../../src/components/CnChartWidget/CnChartWidget.vue'), 'utf8')

/** The `<style>` block, comments stripped. */
const styleBlock = SFC.slice(SFC.indexOf('<style'), SFC.lastIndexOf('</style>'))
	.replace(/\/\*[\s\S]*?\*\//g, '')

/** Selector → declaration-body pairs for every rule naming an apexcharts class. */
const apexRules = styleBlock
	.split('}')
	.map((chunk) => {
		const [selector, body] = chunk.split('{')
		return { selector: (selector || '').trim(), body: (body || '').trim() }
	})
	.filter((rule) => rule.selector.includes('.apexcharts-') && rule.body)

describe('CnChartWidget — apexcharts chrome follows the Nextcloud theme', () => {
	it('overrides the apexcharts chrome at all', () => {
		expect(apexRules.length).toBeGreaterThan(0)
	})

	it('colours every override from Nextcloud tokens, never a literal', () => {
		// A literal is what put us here: it is correct in exactly one theme.
		// Fallbacks inside `var(--x, …)` are allowed — they only apply where the
		// token is absent entirely.
		for (const { selector, body } of apexRules) {
			const outsideVar = body.replace(/var\([^)]*\)/g, '')
			expect({ selector, literal: outsideVar.match(/#[0-9a-f]{3,8}\b|\brgba?\(/i) }).toEqual({ selector, literal: null })
		}
	})

	it.each([
		['.apexcharts-tooltip', 'the hover tooltip surface'],
		['.apexcharts-tooltip-title', 'the date/category header row'],
		['.apexcharts-xaxistooltip', 'the crosshair x-axis tooltip'],
		['.apexcharts-yaxistooltip', 'the crosshair y-axis tooltip'],
		['.apexcharts-menu', 'the toolbar menu panel'],
		['.apexcharts-toolbar', 'the toolbar icons'],
	])('restyles %s (%s)', (cls) => {
		expect(apexRules.some((rule) => rule.selector.includes(cls))).toBe(true)
	})

	it('covers both apexcharts tooltip themes, not just the one we configure', () => {
		// `tooltip.theme` decides only which class is stamped on the element. A
		// consumer overriding `options.tooltip.theme` must not land back on a
		// hardcoded apexcharts palette, so both variants are restyled.
		const tooltipSelectors = apexRules
			.map((rule) => rule.selector)
			.filter((selector) => selector.includes('.apexcharts-tooltip'))
			.join(' ')
		expect(tooltipSelectors).toContain('.apexcharts-theme-light')
		expect(tooltipSelectors).toContain('.apexcharts-theme-dark')
	})

	it('keeps each override ahead of the apexcharts rule it replaces', () => {
		// apexcharts injects its stylesheet when the first chart is created, so
		// it lands after the app's CSS and wins every tie. Its title rule is
		// `.apexcharts-tooltip.apexcharts-theme-* .apexcharts-tooltip-title`
		// (three classes) and its menu-item hover rule is
		// `.apexcharts-theme-light .apexcharts-menu-item:hover` (three) — an
		// override naming only the inner class ties and silently loses.
		for (const { selector } of apexRules) {
			if (selector.includes('.apexcharts-tooltip-title')) {
				expect(selector).toContain('.apexcharts-tooltip.')
			}
			if (selector.includes('.apexcharts-menu-item')) {
				expect(selector).toContain('.apexcharts-menu ')
			}
			if (selector.includes('-icon')) {
				expect(selector).toContain('.apexcharts-toolbar ')
			}
		}
	})

	it('reaches the chrome through :deep(), which is the only thing that can', () => {
		// apexcharts builds the tooltip itself (`elWrap.appendChild`), so it
		// carries no scope attribute — a plain scoped selector never matches it.
		for (const { selector } of apexRules) {
			expect(selector).toContain(':deep(')
			expect(selector).toContain('.cn-chart-widget')
		}
	})
})
