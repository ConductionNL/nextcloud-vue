// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// The stages widget and the status badge tile, on a case detail surface.
//
// dossiq's case page replaced a hand-built transition strip with the `stages`
// widget, and a hand-built three-card row with real `stat` tiles. The stages
// widget speaks Open Register's lifecycle contract, the same one
// CnLifecycleActions speaks, so what these specs drive in a real browser is
// that contract end to end:
//
//  - only the stages an action reaches are clickable, and clicking one POSTs
//    `/transition` with the action id;
//  - a stage no action reaches sends nothing and says why;
//  - a transition that declares `inputs` opens the shared dialog first, and
//    cancelling it sends nothing;
//  - a refused move leaves the record where it was and shows the reason;
//  - the status tile renders as a badge with the row's colour, and a
//    suspended case reads "Suspended" in the warning colour.
//
// They run through the registry, which is the path a manifest placement takes,
// so a broken registration fails here rather than in a consuming app. Every
// request is stubbed with page.route(), so the answers are fixed.

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
}

/**
 * Stub the case page around one mutable record.
 *
 * `/available-actions` answers for the stage the case is on, so a move really
 * does change what the next read offers, the way Open Register behaves.
 *
 * @param {import('@playwright/test').Page} page The page.
 * @param {object} [options] Test options.
 * @param {Array<object>} [options.inputs] Inputs the closing action declares.
 * @param {object} [options.refuse] A refusal body for the transition POST.
 * @return {Promise<{posts: Array<object>, status: string}>} The mutable state.
 */
async function stubCase(page, options = {}) {
	const state = { status: 'st-new', posts: [] }
	const json = (route, body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })

	await page.route('**/apps/dossiq/api/case-types/ct-1/blueprint', (route) => json(route, BLUEPRINT))
	await page.route('**/apps/openregister/api/objects/case-1/available-actions', (route) => json(route, {
		actions: state.status === 'st-new'
			? [{
				action: 'start',
				to: 'st-work',
				requires: null,
				description: 'Take the case into treatment.',
			}, {
				action: 'close',
				to: 'st-done',
				requires: null,
				description: 'Close the case.',
				...(options.inputs ? { inputs: options.inputs } : {}),
			}]
			: [{ action: 'reopen', to: 'st-new', requires: null, description: null }],
	}))
	await page.route('**/apps/openregister/api/objects/case-1/transition', (route) => {
		const body = route.request().postDataJSON()
		state.posts.push(body)
		if (options.refuse) return json(route, options.refuse, 403)
		if (body.action === 'start') state.status = 'st-work'
		return json(route, { id: 'case-1', status: state.status })
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
const STRIP = '[data-testid="cn-stages-widget"] .cn-timeline-stages__stage'

test.describe('the stages widget', () => {
	// PRECONDITION. Every other test in this block clicks a stage. If the
	// widget rendered nothing, "sends nothing" would pass on an empty page, so
	// this proves the three stages are there, in order, with the right current.
	test('the harness really renders the case stages (precondition)', async ({ page }) => {
		await stubCase(page)
		await openHarness(page, '?stageswidget=1', STRIP)

		await expect(page.locator('.cn-timeline-stages__label')).toHaveText(['Ontvangen', 'In behandeling', 'Afgehandeld'])
		await expect(stage(page, 'st-new')).toHaveAttribute('aria-current', 'step')
		await expect(page.getByRole('list', { name: 'Case progress' })).toBeVisible()
	})

	test('clicking a reachable stage posts the action and shows the new stage', async ({ page }) => {
		const state = await stubCase(page)
		await openHarness(page, '?stageswidget=1', STRIP)
		await expect(stage(page, 'st-work')).not.toHaveAttribute('aria-disabled', 'true')

		const posted = page.waitForRequest((request) => request.url().endsWith('/apps/openregister/api/objects/case-1/transition') && request.method() === 'POST')
		await stage(page, 'st-work').click()
		const request = await posted

		expect(request.postDataJSON()).toEqual({ action: 'start' })
		await expect(stage(page, 'st-work')).toHaveAttribute('aria-current', 'step')
		await expect(stage(page, 'st-new')).not.toHaveAttribute('aria-current', 'step')
		// The page re-read the record on the refresh signal the widget fired.
		await expect(page.getByTestId('stages-harness-record-status')).toHaveText('st-work')
		expect(state.posts).toHaveLength(1)
	})

	// THE ABSENCE OF AN ACTION IS THE GUARD. Nothing in the manifest can turn
	// it off, because there is nothing in the manifest that grants it.
	test('a stage no action reaches sends nothing and says why', async ({ page }) => {
		const state = await stubCase(page)
		let transitionRequests = 0
		page.on('request', (request) => {
			if (request.url().endsWith('/transition')) transitionRequests++
		})
		await openHarness(page, '?stageswidget=1', STRIP)
		// Move first, so st-done is no longer among the allowed actions.
		await stage(page, 'st-work').click()
		await expect(stage(page, 'st-work')).toHaveAttribute('aria-current', 'step')
		const before = transitionRequests

		const blocked = stage(page, 'st-done')
		await expect(blocked).toHaveAttribute('aria-disabled', 'true')
		await expect(page.getByTestId('cn-stages-widget-reason-st-done')).toHaveText('Not reachable from the current stage')

		await blocked.click()
		await blocked.press('Enter')
		// Give a wrongly sent request the time to leave before counting.
		await page.waitForTimeout(500)

		expect(transitionRequests).toBe(before)
		expect(state.posts).toHaveLength(1)
		await expect(stage(page, 'st-work')).toHaveAttribute('aria-current', 'step')
		await expect(page.getByTestId('cn-modal')).toHaveCount(0)
	})

	test('a reachable stage shows what the move says about itself', async ({ page }) => {
		await stubCase(page)
		await openHarness(page, '?stageswidget=1', STRIP)

		await expect(page.getByTestId('cn-stages-widget-reason-st-work')).toHaveText('Take the case into treatment.')
		await expect(page.getByTestId('cn-stages-widget-reason-st-work')).toBeVisible()
	})

	// A REFUSED MOVE MUST LEAVE THE RECORD WHERE IT WAS. Open Register
	// re-validates server-side, and its sentence is the one to show.
	test('a refused move keeps the record on its stage and shows the reason', async ({ page }) => {
		await stubCase(page, { refuse: { error: 'Only a coordinator may close a case.' } })
		await openHarness(page, '?stageswidget=1', STRIP)

		await stage(page, 'st-done').click()

		await expect(page.getByTestId('cn-stages-widget-error')).toHaveText('Only a coordinator may close a case.')
		await expect(stage(page, 'st-new')).toHaveAttribute('aria-current', 'step')
		await expect(page.getByTestId('stages-harness-record-status')).toHaveText('st-new')
	})
})

test.describe('a transition that declares inputs', () => {
	const INPUTS = [{ field: 'resultType', required: true }, { field: 'comment', required: false }]

	// ONE DIALOG, ONE INPUT VOCABULARY. This is CnTransitionInputDialog, the
	// dialog CnLifecycleActions opens, not a second one written for timelines.
	// It is also an NcSelect-free path through NcDialog, so the stacking trap
	// select-in-dialog.e2e documents does not apply, but the click still has to
	// land and mean something.
	test('the shared dialog collects them, and the move carries what was typed', async ({ page }) => {
		const state = await stubCase(page, { inputs: INPUTS })
		await openHarness(page, '?stageswidget=1', STRIP)

		await stage(page, 'st-done').click()
		const dialog = page.locator('[data-testid-modal="cn-transition-input-dialog"]')
		await expect(dialog).toBeVisible()
		expect(state.posts).toHaveLength(0)

		await dialog.getByTestId('cn-transition-input-resultType').locator('input').fill('granted')
		await dialog.getByTestId('cn-transition-input-comment').locator('input, textarea').first().fill('All documents are in.')

		const posted = page.waitForRequest((request) => request.url().endsWith('/apps/openregister/api/objects/case-1/transition'))
		// The buttons live in NcDialog's own actions slot, outside the marked
		// body, so they are addressed on the page rather than inside it.
		await page.getByTestId('cn-transition-input-confirm').click()
		const request = await posted

		expect(request.postDataJSON()).toEqual({
			action: 'close',
			data: { resultType: 'granted', comment: 'All documents are in.' },
		})
		await expect(dialog).toBeHidden()
	})

	test('cancelling the dialog sends nothing', async ({ page }) => {
		const state = await stubCase(page, { inputs: INPUTS })
		await openHarness(page, '?stageswidget=1', STRIP)

		await stage(page, 'st-done').click()
		const dialog = page.locator('[data-testid-modal="cn-transition-input-dialog"]')
		await expect(dialog).toBeVisible()
		await page.getByTestId('cn-transition-input-cancel').click()

		await expect(dialog).toBeHidden()
		await page.waitForTimeout(500)
		expect(state.posts).toHaveLength(0)
		await expect(stage(page, 'st-new')).toHaveAttribute('aria-current', 'step')
	})

	test('the confirm waits for a required input', async ({ page }) => {
		await stubCase(page, { inputs: INPUTS })
		await openHarness(page, '?stageswidget=1', STRIP)

		await stage(page, 'st-done').click()
		const dialog = page.locator('[data-testid-modal="cn-transition-input-dialog"]')
		await expect(page.getByTestId('cn-transition-input-confirm')).toBeDisabled()

		await dialog.getByTestId('cn-transition-input-resultType').locator('input').fill('granted')
		await expect(page.getByTestId('cn-transition-input-confirm')).toBeEnabled()
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
