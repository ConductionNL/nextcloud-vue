// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// The stages widget and the status badge tile, on a case detail surface.
//
// dossiq's case page replaced a hand-built transition strip with the `stages`
// widget, and a hand-built three-card row with real `stat` tiles. What these
// specs pin, in a real browser and through the registry path a manifest
// placement takes:
//
//  - clicking a reachable stage sends the transition with the right move,
//    and the page shows the new current stage;
//  - clicking a blocked stage sends nothing, and its reason is on screen;
//  - a move that must be confirmed asks first, and sends what was typed;
//  - the status tile renders as a badge with the row's colour, and a
//    suspended case reads "Suspended" in the warning colour.
//
// Every request is stubbed with page.route(), so the answers are fixed.
//
// Spec scenarios covered (openspec/changes/stat-badge-and-stages-widget/specs/):
//  - @e2e clicking a reachable stage sends the transition and shows the new stage
//  - @e2e clicking a blocked stage sends nothing and shows its reason
//  - @e2e a move set to confirm asks first and sends the comment
//  - @e2e the status tile renders its label and colour as a badge
//  - @e2e a suspended case shows the Suspended badge in the warning colour

import { test, expect } from '@playwright/test'

// The widgets pull the whole detail-host chain, so the first compile of this
// entry is slow. Serial plus a longer budget pays that once (the tabs widget
// spec's precedent).
test.describe.configure({ mode: 'serial', timeout: 120_000 })

const BLUEPRINT = {
	statusTypes: [
		{ id: 'st-done', name: 'Afgehandeld', description: 'Closed', order: 3, isFinal: true },
		{ id: 'st-new', name: 'Ontvangen', description: 'Received', order: 1, isFinal: false },
		{ id: 'st-work', name: 'In behandeling', description: 'In progress', order: 2, isFinal: false },
	],
	resultTypes: [{ id: 'rt-granted', name: 'Toegekend' }],
}

/**
 * Stub dossiq's endpoints and OpenRegister's case read around one mutable
 * case. The transition POST moves the case; the reads answer from it.
 *
 * @param {import('@playwright/test').Page} page The page.
 * @return {Promise<{posts: Array<object>}>} The transition bodies received.
 */
async function stubCase(page) {
	const state = { status: 'st-new', posts: [] }
	const json = (route, body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })

	await page.route('**/apps/dossiq/api/case-types/ct-1/blueprint', (route) => json(route, BLUEPRINT))
	await page.route('**/apps/dossiq/api/case/case-1/available-transitions', (route) => json(route, {
		transitions: state.status === 'st-new'
			? [
				{ id: 'tr-work', toStatus: 'st-work', guardsPassed: true, failedGuards: [] },
				{ id: 'tr-close', toStatus: 'st-done', guardsPassed: false, failedGuards: [{ type: 'requiredDocument', passed: false, failureMessage: 'Upload the decision document first.' }] },
			]
			: [{ id: 'tr-back', toStatus: 'st-new', guardsPassed: true, failedGuards: [] }],
	}))
	await page.route('**/apps/dossiq/api/case/case-1/transition', (route) => {
		const body = route.request().postDataJSON()
		state.posts.push(body)
		if (body.transitionId === 'tr-work') state.status = 'st-work'
		return json(route, { status: state.status })
	})
	await page.route('**/apps/openregister/api/objects/dossiq/case/case-1', (route) => json(route, {
		id: 'case-1', caseType: 'ct-1', status: state.status, suspended: false,
	}))
	return state
}

/**
 * Open the harness, tolerating the cold compile of the first navigation.
 *
 * @param {import('@playwright/test').Page} page The page.
 * @param {string} query The harness query string.
 * @param {string} ready A selector that proves the widget rendered.
 * @return {Promise<void>}
 */
async function openHarness(page, query, ready) {
	await page.goto('/' + query, { waitUntil: 'domcontentloaded', timeout: 90_000 })
	await page.locator(ready).first().waitFor({ state: 'visible', timeout: 60_000 })
}

const stage = (page, id) => page.locator('.cn-timeline-stages__stage').filter({ has: page.getByTestId(`cn-stages-widget-stage-${id}`) })

test.describe('the stages widget', () => {
	// PRECONDITION. Every other test in this block clicks a stage. If the
	// widget rendered nothing, "sends nothing" would pass on an empty page, so
	// this proves the three stages are there, in order, with the right current.
	test('the harness really renders the case stages (precondition)', async ({ page }) => {
		await stubCase(page)
		await openHarness(page, '?stageswidget=1', '[data-testid="cn-stages-widget"] .cn-timeline-stages__stage')

		await expect(page.locator('.cn-timeline-stages__label')).toHaveText(['Ontvangen', 'In behandeling', 'Afgehandeld'])
		await expect(stage(page, 'st-new')).toHaveAttribute('aria-current', 'step')
		await expect(page.getByRole('list', { name: 'Case progress' })).toBeVisible()
	})

	test('clicking a reachable stage sends the transition and shows the new stage', async ({ page }) => {
		const state = await stubCase(page)
		await openHarness(page, '?stageswidget=1', '[data-testid="cn-stages-widget"] .cn-timeline-stages__stage')
		await expect(stage(page, 'st-work')).not.toHaveAttribute('aria-disabled', 'true')

		const posted = page.waitForRequest((request) => request.url().endsWith('/apps/dossiq/api/case/case-1/transition') && request.method() === 'POST')
		await stage(page, 'st-work').click()
		const request = await posted

		expect(request.postDataJSON()).toEqual({ transitionId: 'tr-work' })
		await expect(stage(page, 'st-work')).toHaveAttribute('aria-current', 'step')
		await expect(stage(page, 'st-new')).not.toHaveAttribute('aria-current', 'step')
		// The page re-read the record on the refresh signal the widget fired.
		await expect(page.getByTestId('stages-harness-record-status')).toHaveText('st-work')
		expect(state.posts).toHaveLength(1)
	})

	test('clicking a blocked stage sends nothing and shows its reason', async ({ page }) => {
		const state = await stubCase(page)
		let transitionRequests = 0
		page.on('request', (request) => {
			if (request.url().includes('/transition') && !request.url().includes('available-transitions')) transitionRequests++
		})
		await openHarness(page, '?stageswidget=1', '[data-testid="cn-stages-widget"] .cn-timeline-stages__stage')

		const blocked = stage(page, 'st-done')
		await expect(blocked).toHaveAttribute('aria-disabled', 'true')
		await expect(page.getByTestId('cn-stages-widget-reason-st-done')).toHaveText('Upload the decision document first.')
		await expect(page.getByTestId('cn-stages-widget-reason-st-done')).toBeVisible()

		await blocked.click()
		await blocked.press('Enter')
		// Give a wrongly sent request the time to leave before counting.
		await page.waitForTimeout(500)

		expect(transitionRequests).toBe(0)
		expect(state.posts).toHaveLength(0)
		await expect(stage(page, 'st-new')).toHaveAttribute('aria-current', 'step')
		await expect(page.getByTestId('cn-modal')).toHaveCount(0)
	})

	test('a move set to confirm asks first and sends the comment', async ({ page }) => {
		const state = await stubCase(page)
		await openHarness(page, '?stageswidget=1&confirm=1', '[data-testid="cn-stages-widget"] .cn-timeline-stages__stage')

		await stage(page, 'st-work').click()
		const dialog = page.getByRole('dialog', { name: 'Move to In behandeling' })
		await expect(dialog).toBeVisible()
		expect(state.posts).toHaveLength(0)

		await dialog.getByRole('textbox', { name: 'Comment (optional)' }).fill('All documents are in.')
		const posted = page.waitForRequest((request) => request.url().endsWith('/apps/dossiq/api/case/case-1/transition'))
		await dialog.getByRole('button', { name: 'Move' }).click()
		const request = await posted

		expect(request.postDataJSON()).toEqual({ transitionId: 'tr-work', comment: 'All documents are in.' })
		await expect(dialog).toBeHidden()
		await expect(stage(page, 'st-work')).toHaveAttribute('aria-current', 'step')
	})
})

test.describe('a move that closes the record', () => {
	// THE RESULT PICKER IS AN NcSelect INSIDE AN NcDialog, which is a known
	// stacking trap in this library: `select-in-dialog.e2e.js` documents a
	// dialog mask painted OVER its own teleported dropdown, so the options
	// render, read as visible, and swallow every click. Nothing exercised that
	// path here: the only dialog this spec opened was the comment one.
	//
	// The assertion that matters is the click LANDING and meaning something, so
	// no force:true anywhere. Forcing would bypass the condition under test.
	test('picking a result in the dialog sends it with the move', async ({ page }) => {
		const state = { posts: [] }
		const json = (route, body) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })

		await page.route('**/apps/dossiq/api/case-types/ct-1/blueprint', (route) => json(route, BLUEPRINT))
		await page.route('**/apps/dossiq/api/case/case-1/available-transitions', (route) => json(route, {
			transitions: [{ id: 'tr-close', toStatus: 'st-done', guardsPassed: true, failedGuards: [], requiresResult: 'required' }],
		}))
		await page.route('**/apps/dossiq/api/case/case-1/transition', (route) => {
			state.posts.push(route.request().postDataJSON())
			return json(route, { status: 'st-done' })
		})
		await page.route('**/apps/openregister/api/objects/dossiq/case/case-1', (route) => json(route, {
			id: 'case-1', caseType: 'ct-1', status: state.posts.length ? 'st-done' : 'st-new', suspended: false,
		}))

		await openHarness(page, '?stageswidget=1', '[data-testid="cn-stages-widget"] .cn-timeline-stages__stage')
		await stage(page, 'st-done').click()

		const dialog = page.getByRole('dialog', { name: 'Move to Afgehandeld' })
		await expect(dialog).toBeVisible()
		await expect(dialog.getByText('This stage closes the record')).toBeVisible()

		// The move cannot be confirmed until a result is picked.
		const confirm = dialog.getByRole('button', { name: 'Move' })
		await expect(confirm).toBeDisabled()
		expect(state.posts).toHaveLength(0)

		await dialog.locator('.vs__dropdown-toggle').click()
		const option = page.getByRole('option', { name: 'Toegekend' })
		await expect(option).toBeVisible()
		await option.click({ timeout: 5000 })

		await expect(confirm).toBeEnabled()
		const posted = page.waitForRequest((request) => request.url().endsWith('/apps/dossiq/api/case/case-1/transition'))
		await confirm.click()
		const request = await posted

		expect(request.postDataJSON()).toEqual({ transitionId: 'tr-close', resultTypeId: 'rt-granted' })
		await expect(dialog).toBeHidden()
		await expect(stage(page, 'st-done')).toHaveAttribute('aria-current', 'step')
	})

	test('the result dropdown paints above the dialog mask', async ({ page }) => {
		const json = (route, body) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
		await page.route('**/apps/dossiq/api/case-types/ct-1/blueprint', (route) => json(route, BLUEPRINT))
		await page.route('**/apps/dossiq/api/case/case-1/available-transitions', (route) => json(route, {
			transitions: [{ id: 'tr-close', toStatus: 'st-done', guardsPassed: true, failedGuards: [], requiresResult: 'required' }],
		}))

		await openHarness(page, '?stageswidget=1', '[data-testid="cn-stages-widget"] .cn-timeline-stages__stage')
		await stage(page, 'st-done').click()
		await page.getByRole('dialog').locator('.vs__dropdown-toggle').click()
		await expect(page.getByRole('option', { name: 'Toegekend' })).toBeVisible()

		// Structural, not a magic number: read both computed layers and compare.
		const layers = await page.evaluate(() => {
			const z = (sel) => {
				const el = document.querySelector(sel)
				return el ? Number(getComputedStyle(el).zIndex) : null
			}
			return { menu: z('.vs__dropdown-menu'), mask: z('.modal-mask') }
		})
		expect(layers.menu).not.toBeNull()
		expect(layers.mask).not.toBeNull()
		expect(layers.menu).toBeGreaterThan(layers.mask)
	})
})

test.describe('the status badge tile', () => {
	/**
	 * Stub the status row the tile resolves its uuid through.
	 *
	 * @param {import('@playwright/test').Page} page The page.
	 * @return {Promise<void>}
	 */
	async function stubStatus(page) {
		await page.route('**/api/objects/dossiq/statusType/st-work', (route) => route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({ id: 'st-work', name: 'In behandeling', isFinal: false }),
		}))
	}

	test('the status tile renders its label and colour as a badge', async ({ page }) => {
		await stubStatus(page)
		await openHarness(page, '?statbadge=1&status=st-work', '[data-testid="cn-stat-widget-badge"]')

		const badge = page.getByTestId('cn-stat-widget-badge')
		await expect(badge).toHaveText('In behandeling')
		await expect(badge).toHaveClass(/cn-status-badge--info/)
		// The badge replaces the plain value, it does not sit beside it.
		await expect(page.locator('.cn-stat-widget__value')).toHaveCount(0)
	})

	test('a suspended case shows the Suspended badge in the warning colour', async ({ page }) => {
		await stubStatus(page)
		await openHarness(page, '?statbadge=1&status=st-work&suspended=1', '[data-testid="cn-stat-widget-badge"]')

		const badge = page.getByTestId('cn-stat-widget-badge')
		await expect(badge).toHaveText('Suspended')
		await expect(badge).toHaveClass(/cn-status-badge--warning/)
	})
})
