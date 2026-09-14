// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// A `data` widget in a tab panel holds its content directly: no card of its
// own, no second title, and no header band standing empty above the fields.
//
// Reported on a dossiq case. The panel drew a card inside a card, and the
// widget repeated as a heading the name the open tab already carried.
//
// The obvious fix, hiding the header, was held back for a real reason: Save
// and Discard render INSIDE that header, so hiding it unconditionally takes
// away the control that commits queued changes. So the header is not hidden,
// it is made conditional, and the two states below are the whole contract.
//
// WHY PLAYWRIGHT AND NOT JEST
// ---------------------------
// The jest suite covers the props and the DOM, and it cannot judge either of
// the two claims a reader actually sees.
//
// "No card inside a card" is a computed border and background. "No empty
// header band" is a measured HEIGHT: the band that shipped was 59px of nothing
// but a divider rule, and an element holding no text still occupies its row,
// so a DOM assertion passes with it fully present. jsdom computes no layout at
// all and reports 0 for every rect, which is exactly the value a correct
// implementation produces, so a unit test cannot tell the two apart.
//
// Assertions are on measured geometry rather than on the CSS declarations that
// produce it, so any other correct implementation also passes and only a
// regression fails.

import { expect, test } from '@playwright/test'

const URL = '/?baredata=1'

// Same cold-compile cost as tabs-widget-chrome: this entry pulls CnTabsWidget,
// CnDetailWidgetHost and CnObjectDataWidget through vite's first transform of
// the widget-dispatch chain. Serial with a longer budget pays it once.
test.describe.configure({ mode: 'serial', timeout: 120_000 })

/**
 * Open the harness and switch to the tab holding the data widget.
 *
 * The data widget is the SECOND tab on purpose. The defect was about a widget
 * a reader navigates to, and a single-tab strip takes a different path through
 * CnTabsWidget, so a one-tab harness would not reproduce it.
 *
 * @param {import('@playwright/test').Page} page The page.
 * @return {Promise<void>} Resolves once the data grid is rendered.
 */
async function openDataTab(page) {
	await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 90_000 })
	await page.locator('[data-testid="bd-widget"] .cn-tabs-widget').waitFor({ state: 'visible', timeout: 60_000 })
	await page.locator('.cn-tabs__nav-item').nth(1).click()
	await page.locator('.cn-object-data-widget__grid').waitFor({ state: 'visible', timeout: 30_000 })
}

/**
 * Put the widget into its unsaved state the way a user does.
 *
 * Through the UI rather than by setting state, because which control commits
 * an edit is part of what is under test. The in-cell confirm stages the field
 * and calls save(); the harness passes no store, so save() emits and leaves
 * the field dirty, which is the state that must bring Save within reach.
 *
 * @param {import('@playwright/test').Page} page The page.
 * @return {Promise<void>} Resolves once the edit is staged.
 */
async function makeAnUnsavedEdit(page) {
	await page.locator('.cn-object-data-widget__value--editable').first().click()
	await page.locator('.cn-object-data-widget__editor input').first().fill('Z-2026-9999')
	await page.locator('.cn-object-data-widget__editor-actions button').first().click()
	await page.locator('.cn-widget-wrapper__header').waitFor({ state: 'visible', timeout: 10_000 })
}

/**
 * Open the tab strip's own overflow menu.
 *
 * @param {import('@playwright/test').Page} page The page.
 * @return {Promise<void>} Resolves once the menu is open.
 */
async function openStripMenu(page) {
	await page.locator('[data-testid="cn-tabs-widget-actions"] button').first().click()
	await page.getByRole('menu').waitFor({ state: 'visible', timeout: 10_000 })
}

test.describe('a data widget in a tab panel', () => {
	// PRECONDITION, and not a formality. The first version of the neighbouring
	// tabs spec passed two assertions with zero tabs rendered, because the
	// harness had handed the component the wrong prop names. Every claim below
	// is about the ABSENCE of chrome, and absence is exactly what an unmounted
	// component also shows, so this runs first and fails loudly if the widget
	// never rendered.
	test('the harness really renders the data widget (precondition)', async ({ page }) => {
		await openDataTab(page)
		await expect(page.locator('.cn-tabs__nav-item')).toHaveCount(2)
		await expect(page.locator('.cn-object-data-widget__label')).toHaveCount(3)
		await expect(page.locator('.cn-tabs__content')).toContainText('Z-2026-0041')
	})

	// The tab already names the panel. The widget's own title is the duplicate.
	//
	// The two strings differ in the harness ("Core data" on the tab, "Core case
	// data" on the widget) precisely so this can tell which one survived. With
	// both equal, a count of one proves nothing about which was removed.
	test('the widget does not repeat the name the tab already carries', async ({ page }) => {
		await openDataTab(page)
		await expect(page.locator('.cn-tabs__nav-item').nth(1)).toContainText('Core data')
		await expect(page.locator('.cn-tabs__content')).not.toContainText('Core case data')
		// Nor the prop default. `title` defaults to "Data", so a host passing
		// undefined got a heading nobody chose, which is how this shipped.
		await expect(page.locator('.cn-widget-wrapper__header-left')).toHaveCount(0)
	})

	// THE BAND. With nothing to commit there is no header at all, so the fields
	// begin at the panel's own top edge.
	test('no header band stands above the fields while nothing is being edited', async ({ page }) => {
		await openDataTab(page)
		await expect(page.locator('.cn-widget-wrapper__header')).toHaveCount(0)

		// Measured, because the assertion above would also pass if the header
		// were merely renamed. 59px of empty band is what a reader saw.
		const offset = await page.evaluate(() => {
			const panel = document.querySelector('.cn-tabs__content').getBoundingClientRect()
			const grid = document.querySelector('.cn-object-data-widget__grid').getBoundingClientRect()
			return Math.round(grid.top - panel.top)
		})
		expect(offset).toBeLessThanOrEqual(1)
	})

	// No card inside a card: the panel is the card, the widget draws nothing.
	test('the widget draws no border or background of its own inside the panel', async ({ page }) => {
		await openDataTab(page)
		const chrome = await page.evaluate(() => {
			const px = (v) => Math.round(parseFloat(v) || 0)
			const s = getComputedStyle(document.querySelector('.cn-tabs__content .cn-widget-wrapper'))
			return {
				borderTop: px(s.borderTopWidth),
				borderLeft: px(s.borderLeftWidth),
				borderBottom: px(s.borderBottomWidth),
				background: s.backgroundColor,
			}
		})
		expect(chrome.borderTop).toBe(0)
		expect(chrome.borderLeft).toBe(0)
		expect(chrome.borderBottom).toBe(0)
		// Fully transparent, so the panel's own surface shows through. A second
		// opaque fill is the other half of how a card-in-a-card reads.
		expect(chrome.background).toBe('rgba(0, 0, 0, 0)')
	})

	// The widget's overflow menu is suppressed in a panel because the strip
	// carries its own, eight pixels away. Two Actions menus on one row is the
	// same card-in-a-card tell in miniature.
	test('the widget adds no second actions menu beside the strip\'s own', async ({ page }) => {
		await openDataTab(page)
		await expect(page.locator('[data-testid="cn-tabs-widget-actions"]')).toHaveCount(1)
		await expect(page.locator('.cn-tabs__content [data-testid^="cn-widget-wrapper"]')).toHaveCount(0)
	})

	// THE REASON THE HEADER IS CONDITIONAL RATHER THAN GONE.
	//
	// This is the regression that held the fix back for a release: Save lives
	// inside the header, so a header hidden unconditionally leaves queued
	// changes with no way to commit them. It has to come back on its own the
	// moment there is something to save, and come back WITHOUT the title.
	test('an unsaved edit brings Save within reach, still with no title', async ({ page }) => {
		await openDataTab(page)
		await makeAnUnsavedEdit(page)

		const header = page.locator('.cn-widget-wrapper__header')
		await expect(header).toHaveCount(1)
		await expect(header.getByRole('button', { name: 'Save' })).toBeVisible()
		await expect(header.getByRole('button', { name: 'Discard' })).toBeVisible()

		// The whole point of splitting the two conditions. The band is back for
		// the controls; the duplicate heading stays gone.
		await expect(page.locator('.cn-widget-wrapper__header-left')).toHaveCount(0)
		await expect(page.locator('.cn-widget-wrapper__header--actions-only')).toHaveCount(1)
		await expect(page.locator('.cn-tabs__content')).not.toContainText('Core case data')
	})

	// WHAT THE PANEL'S OWN MENU ITEMS DO INSTEAD.
	//
	// Dropping the widget's header also dropped its overflow menu, and two items
	// lived only there: Metadata, and the full edit dialog. They are not rebuilt
	// on the strip, they are published to it, because the dialog is configured
	// per widget and commits through that widget's save path. So the test that
	// matters is not that the items APPEAR but that clicking one reaches the
	// widget that owns it.
	test('the open panel lends its own items to the strip\'s menu', async ({ page }) => {
		await openDataTab(page)
		await openStripMenu(page)

		const menu = page.getByRole('menu')
		await expect(menu.getByText('Metadata')).toBeVisible()
		await expect(menu.getByText('Edit')).toBeVisible()
		// Still one menu, not two. The built-in trio keeps its place above them.
		await expect(page.locator('[data-testid="cn-tabs-widget-actions"]')).toHaveCount(1)
		await expect(menu.getByText('Refresh')).toBeVisible()
	})

	// The items belong to the OPEN panel, and `lazy` makes that a real
	// distinction: a visited tab stays mounted, so the data widget is still
	// alive and still publishing while another tab is showing. Without keying by
	// widget id the strip would offer Metadata for a sheet nobody is looking at.
	test('a panel\'s items leave the menu when another tab is open', async ({ page }) => {
		await openDataTab(page)
		await openStripMenu(page)
		await expect(page.getByRole('menu').getByText('Metadata')).toBeVisible()
		await page.keyboard.press('Escape')

		await page.locator('.cn-tabs__nav-item').nth(0).click()
		await openStripMenu(page)
		await expect(page.getByRole('menu').getByText('Metadata')).toHaveCount(0)
		await expect(page.getByRole('menu').getByText('Refresh')).toBeVisible()

		// The precondition for this test meaning anything: the panel really is
		// still mounted, so its absence from the menu is the filter working and
		// not the widget having been torn down.
		await expect(page.locator('.cn-object-data-widget__grid')).toHaveCount(1)
	})

	// THE CLAIM THAT THE WHOLE MECHANISM RESTS ON. The button is rendered by an
	// ancestor; the dialog it opens belongs to the widget. If the descriptor's
	// callback did not close over the publishing widget, this would open nothing,
	// or open a dialog with no object in it.
	test('Metadata from the strip opens the widget\'s own modal, with this object in it', async ({ page }) => {
		await openDataTab(page)
		await openStripMenu(page)
		await page.getByRole('menu').getByText('Metadata').click()

		const dialog = page.getByRole('dialog').first()
		await expect(dialog).toBeVisible()
		// The record the panel is bound to, not an empty shell.
		await expect(dialog).toContainText('case-1')
		await expect(dialog).toContainText('In review')
	})

	// Reachable, not merely present. A control rendered behind the strip or off
	// the panel is not a way to commit anything, and `toBeVisible` does not
	// check either.
	test('the Save button is actually clickable where it lands', async ({ page }) => {
		await openDataTab(page)
		await makeAnUnsavedEdit(page)

		const save = page.locator('.cn-widget-wrapper__header').getByRole('button', { name: 'Save' })
		const box = await save.boundingBox()
		expect(box).not.toBeNull()

		// Playwright's own actionability check: it refuses a click on a control
		// something else covers, so this fails if the strip overlaps it.
		await save.click({ timeout: 5_000 })

		// The harness passes no store, so save() emits rather than persisting.
		// The assertion is that the click reached the control, which the
		// successful click above already settles; this only confirms the click
		// did not navigate or tear the panel down.
		await expect(page.locator('.cn-object-data-widget__grid')).toBeVisible()
	})
})
