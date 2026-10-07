// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// Zuiddrecht pixel gaps, round 2: the three claims that are LAYOUT, so jsdom
// (which computes no layout and reports 0 for every rect) cannot judge them.
//
//  - the navigation's primary action shows at its full height when the column
//    overflows (it was a 24px sliver of "New case" on :8080);
//  - a breadcrumb whose root crumb declares a label prints that label;
//  - the stages bars put every label on one line, whether the label is a
//    clickable <button> or the current step's <span>.
//
// Each claim has a control that runs the same surface without the change's
// key, so a passing assertion is about the change and not about the harness.
//
// @spec openspec/changes/zuiddrecht-pixel-gaps-2/specs/zuiddrecht-pixel-gaps-2/spec.md#requirement-the-navigation-primary-action-is-never-clipped
// @spec openspec/changes/zuiddrecht-pixel-gaps-2/specs/zuiddrecht-pixel-gaps-2/spec.md#requirement-a-declared-breadcrumb-label-shows-as-text
// @spec openspec/changes/zuiddrecht-pixel-gaps-2/specs/zuiddrecht-pixel-gaps-2/spec.md#requirement-the-stages-bar-labels-share-one-line

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

/**
 * Open the harness, tolerating the cold compile of the first navigation.
 *
 * @param {import('@playwright/test').Page} page The page.
 * @param {string} query The harness query string.
 * @param {string} ready A selector that proves the surface rendered.
 * @return {Promise<void>}
 */
async function openHarness(page, query, ready) {
	await page.goto('/' + query, { waitUntil: 'domcontentloaded', timeout: 90_000 })
	await page.locator(ready).first().waitFor({ state: 'visible', timeout: 60_000 })
}

/**
 * Nextcloud core's rule for every non-library button (core/css/inputs.scss):
 * a min-height of the clickable area with the text centred in it. The harness
 * does not load core CSS, and this rule is what moved the clickable stage
 * labels down on a real instance, so it is added as written there.
 */
const NC_CORE_BUTTON_CSS = `
:root { --default-clickable-area: 34px; }
button:not(.button-vue, [class^="vs__"]) {
	padding: calc((var(--default-clickable-area) - 1lh) / 2) 12px;
	width: auto;
	min-height: var(--default-clickable-area);
	box-sizing: border-box;
	border: none;
}
`

test.describe('the navigation primary action', () => {
	// The visible part of the button: its own rect clipped by the scrolling
	// navigation body it sits in.
	const visibleHeight = (page) => page.evaluate(() => {
		const button = document.querySelector('[data-testid="cn-nav-primary-action"] button, [data-testid="cn-nav-primary-action"] a')
		const body = button.closest('.app-navigation__body')
		const b = button.getBoundingClientRect()
		const c = body.getBoundingClientRect()
		return { button: b.height, visible: Math.max(0, Math.min(b.bottom, c.bottom) - Math.max(b.top, c.top)) }
	})

	test('shows the whole button when the column overflows', async ({ page }) => {
		await openHarness(page, '?pixgaps2=nav', '[data-testid="cn-nav-primary-action"]')
		const { button, visible } = await visibleHeight(page)
		expect(button).toBeGreaterThanOrEqual(30)
		expect(visible).toBeCloseTo(button, 0)
	})

	test('the footer keeps its entries when nav.footer is not declared (control)', async ({ page }) => {
		await openHarness(page, '?pixgaps2=nav&plain=1', '[data-testid="cn-nav-primary-action"]')
		await expect(page.locator('.cn-app-nav__footer-list [data-testid="cn-nav-entry-store"]')).toBeVisible()
		await expect(page.getByTestId('cn-nav-help')).toBeVisible()
	})

	test('a declared footer puts settings above help and folds the rest away', async ({ page }) => {
		await openHarness(page, '?pixgaps2=nav', '[data-testid="cn-nav-primary-action"]')
		// Store is no longer a footer entry; it moved into the settings foldout.
		await expect(page.locator('.cn-app-nav__footer-list [data-testid="cn-nav-entry-store"]')).toHaveCount(0)
		await expect(page.locator('[data-testid="cn-nav-settings"] [data-testid="cn-nav-entry-store"]')).toHaveCount(1)
		const settings = await page.getByTestId('cn-nav-settings').boundingBox()
		const help = await page.getByTestId('cn-nav-help').boundingBox()
		expect(settings.y).toBeLessThan(help.y)
	})
})

test.describe('the breadcrumb root crumb', () => {
	test('is a home icon without rootText (control)', async ({ page }) => {
		await openHarness(page, '?pixgaps2=crumbs&plain=1', '[data-testid="cn-breadcrumbs"]')
		await expect(page.getByTestId('cn-breadcrumbs-crumb-0')).not.toContainText('All cases')
	})

	test('prints its label with rootText', async ({ page }) => {
		await openHarness(page, '?pixgaps2=crumbs', '[data-testid="cn-breadcrumbs"]')
		await expect(page.getByTestId('cn-breadcrumbs-crumb-0')).toContainText('All cases')
		await expect(page.getByRole('link', { name: 'All cases' })).toBeVisible()
	})
})

test.describe('the stages bars', () => {
	const BLUEPRINT = {
		statusTypes: [
			{ id: 'st-new', name: 'Ontvangen', order: 1, isFinal: false },
			{ id: 'st-work', name: 'In behandeling', order: 2, isFinal: false },
			{ id: 'st-done', name: 'Afgehandeld', order: 3, isFinal: true },
		],
	}

	test('every label sits on the same line, buttons and the current span alike', async ({ page }) => {
		const json = (route, body) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
		await page.route('**/apps/dossiq/api/case-types/ct-1/blueprint', (route) => json(route, BLUEPRINT))
		await page.route('**/apps/openregister/api/objects/case-1/available-actions', (route) => json(route, {
			actions: [{ action: 'start', to: 'st-work', requires: null }, { action: 'close', to: 'st-done', requires: null }],
		}))
		await openHarness(page, '?stageswidget=1&variant=bars', '[data-testid="cn-stages-widget-bars"]')
		await page.addStyleTag({ content: NC_CORE_BUTTON_CSS })

		// Precondition: the reachable stages ARE buttons and the current one is
		// not, so the comparison below really compares the two kinds.
		await expect(page.locator('button[data-testid="cn-stages-widget-stage-st-work"]')).toHaveCount(1)
		await expect(page.locator('span[data-testid="cn-stages-widget-stage-st-new"]')).toHaveCount(1)

		// The TEXT's own rect, not the element's: a 34px button and a 20px span
		// start at the same top, and the button centres its text lower inside.
		const tops = await page.evaluate(() => ['st-new', 'st-work', 'st-done'].map((id) => {
			const label = document.querySelector(`[data-testid="cn-stages-widget-stage-${id}"]`)
			const text = [...label.childNodes].find((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim() !== '')
			const range = document.createRange()
			range.selectNodeContents(text)
			return range.getBoundingClientRect().top
		}))
		expect(Math.max(...tops) - Math.min(...tops)).toBeLessThanOrEqual(1)
	})
})
