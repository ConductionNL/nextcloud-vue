// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// The run view, as it is read: the sidebar's tabs and the objects panel.
//
// Reported from a live instance, on a failed run of a flow that waits for a
// lock. Two things were wrong with the panel that opened:
//
//   1. Objects, Tasks and Logs were hand rolled buttons rendered inside
//      NcAppSidebar, so they did not look or behave like the sidebar's tabs.
//      A jest stub cannot settle that: NcAppSidebarTab registers itself with
//      NcAppSidebarTabs through an injection, and a stub registers nothing.
//      Only a browser running the real components shows whether the strip the
//      reader sees is Nextcloud's.
//
//   2. The Objects panel said "this run changed no objects" one line under an
//      error naming the object the run was stuck on. It was filled from the
//      audit read, which reports what a run CHANGED, and this run changed
//      nothing. What it was ABOUT is on the run's own record.
//
// The run is fetched for real over stubbed routes rather than written into the
// store, because the defect was in what `inspectRun()` kept off that response.

import { expect, test } from '@playwright/test'

const HARNESS = '/?runsidebar=1'

const FLOW_ID = 'flow-88'
const RUN_UUID = 'run-88'
const CASE_UUID = '2e98a265-401c-426f-9dc5-1e07f7f442c9'
const CASE_TITLE = 'Dakkapel Kerkstraat 12'

/** The run's own error, which names the object the panel could not show. */
const LOCK_ERROR = `Waited as long as allowed for object ${CASE_UUID}, and it is still locked`

/**
 * Answer the reads opening a run makes.
 *
 * ⚠️ THE OBJECTS ROUTE IS REGISTERED AFTER THE RUN'S OWN RECORD, and both are
 * one path segment apart. Playwright gives the later route the match, so the
 * order here is what keeps `/flow-runs/{uuid}` from being answered with the
 * empty object list.
 *
 * @param {import('@playwright/test').Page} page The page.
 * @return {Promise<void>}
 */
async function stubRun(page) {
	await page.route(`**/apps/openregister/api/flow-runs/${RUN_UUID}`, (route) => {
		route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({
				uuid: RUN_UUID,
				flowId: FLOW_ID,
				flowVersion: null,
				status: 'failed',
				created: '2026-09-05T15:59:48+00:00',
				error: LOCK_ERROR,
				// What the run is about, and what it is holding at a step. The
				// audit read below has neither, which is the whole point.
				subjects: { trigger: { uuid: CASE_UUID, register: 'dossiq', schema: 'case' } },
				placeItems: { lock: [{ json: { id: CASE_UUID, title: CASE_TITLE } }] },
				log: [{ transition: 'lock', status: 'failed', error: LOCK_ERROR }],
			}),
		})
	})

	// The audit read, answering truthfully that the run changed nothing.
	await page.route('**/apps/openregister/api/flow-runs/*/objects**', (route) => {
		route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ run: RUN_UUID, nodes: [] }) })
	})
	await page.route('**/apps/openregister/api/flow-tasks**', (route) => {
		route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ results: [], total: 0 }) })
	})
}

/**
 * Open the run the way the sidebar's own link does.
 *
 * @param {import('@playwright/test').Page} page The page.
 * @return {Promise<void>}
 */
async function openRun(page) {
	await page.evaluate((uuid) => window.__cnFlowStore.inspectRun(uuid), RUN_UUID)
	await expect(page.locator('[data-testid="run-detail-sidebar"]')).toBeVisible()
}

test.describe('the run sidebar', () => {
	test('gives the run Nextcloud’s own sidebar tabs', async ({ page }) => {
		await stubRun(page)
		await page.goto(HARNESS)
		await openRun(page)

		// The strip NcAppSidebarTabs builds from the registered tabs. Its class
		// is the assertion: a hand rolled strip renders none of it.
		const tabs = page.locator('.app-sidebar-tabs__nav .app-sidebar-tabs__tab')
		await expect(tabs).toHaveCount(3)
		await expect(tabs.nth(0)).toContainText('Objects')
		await expect(tabs.nth(1)).toContainText('Tasks')
		await expect(tabs.nth(2)).toContainText('Logs')
	})

	test('switches panel from the sidebar’s strip, with no strip of its own', async ({ page }) => {
		await stubRun(page)
		await page.goto(HARNESS)
		await openRun(page)

		// One strip on screen. A second one is how the old defect returns.
		await expect(page.locator('.cn-run-sidebar__tabs')).toHaveCount(0)

		await page.locator('.app-sidebar-tabs__tab', { hasText: 'Logs' }).click()
		await expect(page.locator('[data-testid="flow-run-panel-logs"]')).toBeVisible()
		await expect(page.locator('[data-testid="flow-run-panel-logs"]')).toContainText('lock')
	})

	/**
	 * ⚠️ THE REPORTED ONE. The audit read answers `nodes: []`, so everything
	 * here comes from the run's own record, which is exactly what used to be
	 * discarded.
	 */
	test('lists the object a failed run is stuck on, which it never changed', async ({ page }) => {
		await stubRun(page)
		await page.goto(HARNESS)
		await openRun(page)

		// The error names the object, so the panel must be able to show it.
		await expect(page.locator('[data-testid="run-error"]')).toContainText(CASE_UUID)

		const subjects = page.locator('[data-testid="flow-run-subjects"]')
		await expect(subjects).toBeVisible()
		await expect(subjects).toContainText(CASE_UUID)
		await expect(subjects).toContainText(CASE_TITLE)
		// The role, so a subject is never read as a change.
		await expect(subjects).toContainText('trigger')

		// And the truthful line about changes stays, under its own heading.
		await expect(page.locator('[data-testid="flow-run-panel-objects"]')).toContainText('This run changed no objects.')
	})

	/**
	 * The sidebar's heading, which NcAppSidebar renders and which this
	 * component used to leave empty by passing no `name`. An empty h2 above the
	 * real title is a heading that names nothing, and a screen reader announces
	 * it as a heading anyway. Asserted in a browser because the empty one came
	 * from NcAppSidebar itself, not from anything in this repo's templates.
	 */
	test('leaves no heading in the sidebar empty', async ({ page }) => {
		await stubRun(page)
		await page.goto(HARNESS)
		await openRun(page)

		const empty = await page.evaluate(() => Array.from(document.querySelectorAll('aside h1, aside h2, aside h3, aside h4'))
			.filter((heading) => heading.textContent.trim() === '')
			.map((heading) => heading.tagName + '.' + heading.className))

		expect(empty).toEqual([])
	})

	test('names the run’s status and time from the run’s own record', async ({ page }) => {
		await stubRun(page)
		await page.goto(HARNESS)
		await openRun(page)

		// The run history list is capped at 25 and the harness seeded none, so
		// a header that renders at all is reading the record this fetch kept.
		await expect(page.locator('[data-testid="run-status"]')).toHaveText('failed')
	})
})
