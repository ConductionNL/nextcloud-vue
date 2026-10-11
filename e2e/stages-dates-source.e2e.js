// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// screens-stage-dates-source: the process bar takes the dates the case reached
// each step from a per-case endpoint of its own (dossiq's
// `/case-types/{id}/blueprint?case=<id>`), merged into the steps by id, and
// shows them in the board's short form. Real widget through the registry
// (StagesHarness.vue, ?stageswidget=1&variant=bars&dates=1&look=board); every
// request is stubbed.
//
// @spec openspec/changes/screens-stage-dates-source/specs/stage-dates-source/spec.md#requirement-the-reached-dates-can-come-from-their-own-endpoint

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

const TYPES = {
	statusTypes: [
		{ id: 'st-new', name: 'Ontvangen', order: 1, isFinal: false },
		{ id: 'st-work', name: 'In behandeling', order: 2, isFinal: false },
		{ id: 'st-done', name: 'Afgehandeld', order: 3, isFinal: true },
	],
}

const REACHED = {
	statuses: [
		{ statusType: 'st-new', reachedAt: '2026-10-03T09:00:00' },
		{ statusType: 'st-work', reachedAt: '2026-10-04T09:00:00' },
	],
}

/**
 * Stub the case: the type's step list, the per-case dates, the allowed moves.
 *
 * @param {import('@playwright/test').Page} page The page.
 * @return {Promise<{datesCalls: string[]}>} The dates requests seen.
 */
async function stub(page) {
	const state = { datesCalls: [] }
	const json = (route, body) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
	await page.route((url) => url.pathname.endsWith('/apps/dossiq/api/case-types/ct-1/blueprint'), (route) => {
		const url = new URL(route.request().url())
		if (url.searchParams.get('case')) {
			state.datesCalls.push(url.search)
			return json(route, REACHED)
		}
		return json(route, TYPES)
	})
	await page.route('**/apps/openregister/api/objects/case-1/available-actions', (route) => json(route, { actions: [] }))
	await page.route('**/apps/openregister/api/objects/dossiq/case/case-1', (route) => json(route, { id: 'case-1', caseType: 'ct-1', status: 'st-work' }))
	return state
}

/**
 * The date line under each bar, in order.
 *
 * @param {import('@playwright/test').Page} page The page.
 * @return {Promise<Array<string|null>>} The lines.
 */
function dateLines(page) {
	return page.locator('.cn-stages-widget__bar-step').evaluateAll((steps) => steps.map((step) => {
		const line = step.querySelector('.cn-stages-widget__bar-date')
		return line ? line.textContent.trim() : null
	}))
}

test.describe('the stage bars read the reached dates from datesSource', () => {
	test('board look: short dates merged by id, "since" on the current step, one request', async ({ page }) => {
		const state = await stub(page)
		await page.goto('/?stageswidget=1&status=st-work&variant=bars&dates=1&look=board', { waitUntil: 'domcontentloaded', timeout: 90_000 })
		await expect(page.locator('.cn-stages-widget__bar-step')).toHaveCount(3, { timeout: 60_000 })
		await expect(page.locator('.cn-stages-widget__bar-date').first()).toBeVisible({ timeout: 30_000 })
		const expected = await page.evaluate(() => {
			const short = (iso) => new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' }).format(new Date(iso))
			return [short('2026-10-03T09:00:00'), short('2026-10-04T09:00:00')]
		})
		expect(await dateLines(page)).toEqual([expected[0], `since ${expected[1]}`, null])
		expect(state.datesCalls).toHaveLength(1)
		expect(state.datesCalls[0]).toContain('case=case-1')
	})

	test('without datesSource the bars ask nothing more and show no dates (control)', async ({ page }) => {
		const state = await stub(page)
		await page.goto('/?stageswidget=1&status=st-work&variant=bars&look=board', { waitUntil: 'domcontentloaded', timeout: 90_000 })
		await expect(page.locator('.cn-stages-widget__bar-step')).toHaveCount(3, { timeout: 60_000 })
		expect(await dateLines(page)).toEqual([null, null, null])
		expect(state.datesCalls).toHaveLength(0)
	})
})
