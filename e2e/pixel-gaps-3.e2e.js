// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// Zuiddrecht pixel gaps, round 3: the claims that are LAYOUT or that depend on
// what a real component does with our markup, so jsdom (no layout, stubbed
// @nextcloud/vue) cannot judge them.
//
//  - a ground greeting's view switch sits on the heading's line in a tall cell;
//  - a stacked bar with `inset` starts 24px inside its card;
//  - the stages bar labels keep one line and their column under nldesign's
//    !important button rule and core's button margin;
//  - a long detail title leaves the header actions on its row;
//  - the next-step kicker keeps its size under nldesign's !important h3 rule;
//  - of two menu entries on one route only the best match is lit, with the
//    real NcAppNavigationItem and a real vue-router.
//
// Each claim has a control that runs the same surface without the change's key,
// or without the theme rule, so a passing assertion is about the change.
//
// @spec openspec/changes/zuiddrecht-pixel-gaps-3/specs/zuiddrecht-pixel-gaps-3/spec.md#requirement-a-ground-greeting-lines-its-switch-up-with-the-heading
// @spec openspec/changes/zuiddrecht-pixel-gaps-3/specs/zuiddrecht-pixel-gaps-3/spec.md#requirement-a-strip-and-a-stacked-bar-can-take-the-board-inset
// @spec openspec/changes/zuiddrecht-pixel-gaps-3/specs/zuiddrecht-pixel-gaps-3/spec.md#requirement-the-stages-bar-labels-hold-their-line-under-a-button-theme
// @spec openspec/changes/zuiddrecht-pixel-gaps-3/specs/zuiddrecht-pixel-gaps-3/spec.md#requirement-a-long-title-keeps-the-header-actions-on-its-row
// @spec openspec/changes/zuiddrecht-pixel-gaps-3/specs/zuiddrecht-pixel-gaps-3/spec.md#requirement-the-next-step-kicker-stays-a-kicker-under-a-heading-theme
// @spec openspec/changes/zuiddrecht-pixel-gaps-3/specs/zuiddrecht-pixel-gaps-3/spec.md#requirement-only-the-best-matching-menu-entry-is-active

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

/**
 * Open the harness, tolerating the cold compile of the first navigation.
 *
 * @param {import('@playwright/test').Page} page The page.
 * @param {string} query The harness query string (and hash).
 * @param {string} ready A selector that proves the surface rendered.
 * @return {Promise<void>}
 */
async function openHarness(page, query, ready) {
	await page.goto('/' + query, { waitUntil: 'domcontentloaded', timeout: 90_000 })
	await page.locator(ready).first().waitFor({ state: 'visible', timeout: 60_000 })
}

/**
 * Nextcloud core's rule for every non-library button (core/css/inputs.scss)
 * and its margin, plus thematiq's nldesign button rule as it ships in
 * css/systems/nldesign/theme.css, with its !important. The harness loads
 * neither stylesheet, and these rules are what put the clickable stage labels
 * 10px low and let them overlap on :8080.
 */
const BUTTON_THEME_CSS = `
:root { --default-clickable-area: 34px; }
button:not(.button-vue, [class^="vs__"]) {
	padding: calc((var(--default-clickable-area) - 1lh) / 2) 12px;
	width: auto;
	min-height: var(--default-clickable-area);
	box-sizing: border-box;
}
button:not(.button-vue, [class^="vs__"]):not(.app-navigation-entry-button) {
	margin: 3px 3px 3px 0;
}
button:not(.action-button) {
	padding: 8px 16px !important;
	min-width: max-content !important;
	white-space: nowrap !important;
	overflow: visible !important;
	text-overflow: clip !important;
}
`

/** thematiq's nldesign heading rule for an h3, with the Zuiddrecht token. */
const HEADING_THEME_CSS = 'h3 { font-size: 18px !important; }'

test.describe('a ground greeting with a view switch', () => {
	const bottoms = (page) => page.evaluate(() => ({
		heading: document.querySelector('.cn-header-widget__title').getBoundingClientRect().bottom,
		views: document.querySelector('[data-testid="cn-header-widget-views"]').getBoundingClientRect().bottom,
	}))

	test('the switch sits at the bottom of a tall cell without ground (control)', async ({ page }) => {
		await openHarness(page, '?pixgaps3=greeting&plain=1#/', '[data-testid="cn-header-widget-views"]')
		const { heading, views } = await bottoms(page)
		expect(views - heading).toBeGreaterThan(20)
	})

	test('the switch lines up with the heading with ground', async ({ page }) => {
		await openHarness(page, '?pixgaps3=greeting#/', '[data-testid="cn-header-widget-views"]')
		const { heading, views } = await bottoms(page)
		expect(Math.abs(views - heading)).toBeLessThanOrEqual(2)
	})
})

test.describe('a stacked bar in a flush card', () => {
	const offsets = (page) => page.evaluate(() => {
		const card = document.querySelector('.cn-widget-wrapper__content').getBoundingClientRect()
		const bar = document.querySelector('.cn-stacked-bar__bar').getBoundingClientRect()
		return { left: bar.left - card.left, right: card.right - bar.right }
	})

	test('runs edge to edge without inset (control)', async ({ page }) => {
		await openHarness(page, '?pixgaps3=bar&plain=1', '.cn-stacked-bar__bar')
		const { left, right } = await offsets(page)
		expect(left).toBeCloseTo(0, 0)
		expect(right).toBeCloseTo(0, 0)
	})

	test('starts and ends 24px in with inset', async ({ page }) => {
		await openHarness(page, '?pixgaps3=bar', '.cn-stacked-bar__bar')
		const { left, right } = await offsets(page)
		expect(left).toBeCloseTo(24, 0)
		expect(right).toBeCloseTo(24, 0)
	})
})

test.describe('the stages bar labels under a theme that restyles every button', () => {
	const NAMES = ['Ontvangst', 'Beoordeling ontvankelijkheid', 'Zoeken documenten', 'Beoordelen documenten', 'Lakken / Anonimiseren', 'Besluit', 'Publicatie', 'Afgehandeld']
	const BLUEPRINT = { statusTypes: NAMES.map((name, index) => ({ id: `st-${index}`, name, order: index + 1, isFinal: index === NAMES.length - 1 })) }

	async function openStages(page, withTheme) {
		const json = (route, body) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
		await page.route('**/apps/dossiq/api/case-types/ct-1/blueprint', (route) => json(route, BLUEPRINT))
		await page.route('**/apps/openregister/api/objects/case-1/available-actions', (route) => json(route, {
			actions: NAMES.slice(1).map((name, index) => ({ action: `to-${index + 1}`, to: `st-${index + 1}`, requires: null })),
		}))
		await openHarness(page, '?stageswidget=1&variant=bars&status=st-2', '[data-testid="cn-stages-widget-bars"]')
		if (withTheme) {
			await page.addStyleTag({ content: BUTTON_THEME_CSS })
		}
		await expect(page.locator('button[data-testid="cn-stages-widget-stage-st-1"]')).toHaveCount(1)
		await expect(page.locator('span[data-testid="cn-stages-widget-stage-st-2"]')).toHaveCount(1)
		return page.evaluate((count) => Array.from({ length: count }, (_, index) => {
			const label = document.querySelector(`[data-testid="cn-stages-widget-stage-st-${index}"]`)
			const column = label.closest('li').getBoundingClientRect()
			const text = [...label.childNodes].find((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim() !== '')
			const range = document.createRange()
			range.selectNodeContents(text)
			const box = label.getBoundingClientRect()
			return { textTop: range.getBoundingClientRect().top, overflow: box.right - column.right }
		}), NAMES.length)
	}

	test('every label shares a line and keeps to its column without the theme (control)', async ({ page }) => {
		const labels = await openStages(page, false)
		const tops = labels.map((l) => l.textTop)
		expect(Math.max(...tops) - Math.min(...tops)).toBeLessThanOrEqual(1)
		expect(Math.max(...labels.map((l) => l.overflow))).toBeLessThanOrEqual(0.5)
	})

	test('every label shares a line and keeps to its column under the theme', async ({ page }) => {
		const labels = await openStages(page, true)
		const tops = labels.map((l) => l.textTop)
		expect(Math.max(...tops) - Math.min(...tops)).toBeLessThanOrEqual(1)
		expect(Math.max(...labels.map((l) => l.overflow))).toBeLessThanOrEqual(0.5)
	})
})

test.describe('a detail header that holds a widget', () => {
	test('keeps the actions on the row of a long title', async ({ page }) => {
		await page.setViewportSize({ width: 1440, height: 900 })
		await openHarness(page, '?pixgaps3=header', '[data-testid="pixgaps3-title"]')
		const { title, actions } = await page.evaluate(() => ({
			title: document.querySelector('[data-testid="pixgaps3-title"]').getBoundingClientRect().toJSON(),
			actions: document.querySelector('[data-testid="pixgaps3-actions"]').getBoundingClientRect().toJSON(),
		}))
		// On the title's row: the actions start above the title's last line
		// and to the right of the title.
		expect(actions.top).toBeLessThan(title.bottom)
		expect(actions.left).toBeGreaterThanOrEqual(title.right - 1)
	})
})

test.describe('the next-step kicker', () => {
	const kickerSize = (page) => page.evaluate(() => Number.parseFloat(getComputedStyle(document.querySelector('.cn-next-step-card__title')).fontSize))

	test('is 0.85em of its context without a heading theme (control)', async ({ page }) => {
		await openHarness(page, '?pixgaps3=kicker', '[data-testid="cn-next-step-card"]')
		expect(await kickerSize(page)).toBeCloseTo(12.75, 1)
	})

	test('stays 0.85em under an !important h3 rule', async ({ page }) => {
		await openHarness(page, '?pixgaps3=kicker', '[data-testid="cn-next-step-card"]')
		await page.addStyleTag({ content: HEADING_THEME_CSS })
		expect(await kickerSize(page)).toBeCloseTo(12.75, 1)
	})
})

test.describe('two menu entries on one route', () => {
	const litEntries = (page) => page.evaluate(() => [...document.querySelectorAll('[data-testid^="cn-nav-entry-"]')]
		.filter((li) => li.querySelector(':scope > .app-navigation-entry.active, :scope .app-navigation-entry.active'))
		.map((li) => li.getAttribute('data-testid').replace('cn-nav-entry-', '')))

	test('an entry with a route of its own is lit on that route (control)', async ({ page }) => {
		await openHarness(page, '?pixgaps3=nav#/board', '[data-testid="cn-nav-entry-board"]')
		await expect.poll(() => litEntries(page)).toEqual(['board'])
	})

	test('only "All cases" is lit on the unfiltered list', async ({ page }) => {
		await openHarness(page, '?pixgaps3=nav#/cases', '[data-testid="cn-nav-entry-cases"]')
		await expect.poll(() => litEntries(page)).toEqual(['cases'])
	})

	test('only "Woo requests" is lit on the filtered list, reached by a click', async ({ page }) => {
		await openHarness(page, '?pixgaps3=nav#/cases', '[data-testid="cn-nav-entry-woo"]')
		await page.locator('[data-testid="cn-nav-entry-woo"] a').first().click()
		await expect(page).toHaveURL(/#\/cases\?caseType=woo$/)
		await expect.poll(() => litEntries(page)).toEqual(['woo'])
	})
})
