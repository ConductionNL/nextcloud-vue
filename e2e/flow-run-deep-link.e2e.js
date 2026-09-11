// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// Clicking a run in the Flow runs widget opens THAT run.
//
// THE JOURNEY, END TO END
// -----------------------
// This is the bug as it was reported, on a dossiq case: a caseworker clicks a
// row in the Flow runs widget and lands on a flow screen that does not show
// the run they clicked. The chain has three links and each was covered
// separately before this spec existed, which is exactly how a chain breaks in
// the middle with every link reporting green:
//
//   CnFlowRunsWidget  ->  vue-router  ->  CnPageRenderer  ->  CnFlowEditorPage
//        (?run=)                            (type: flow)        (opens the run)
//
// So the router here is REAL, not a stub. A `jest.fn()` push proves the widget
// meant to navigate; it cannot prove anything routed, that the destination
// resolved, or that the run arrived. Those are the parts that were broken.
//
// Spec scenarios covered:
//  - @e2e clicking a run routes to its flow with the run in the query
//  - @e2e the flow that opens has that run inspected, not merely open
//  - @e2e a row with no run uuid still opens the flow, with no empty ?run=

import { expect, test } from '@playwright/test'

const HARNESS = '/?runlink=1'

const FLOW_ID = 'flow-77'
const RUN_UUID = 'run-77'
const RUN_VERSION = 2

/** Only on the version this run executed, so "the run opened" is visible. */
const SINCE_DELETED = 'Deleted since the run'

/**
 * Answer every read this journey makes.
 *
 * @param {import('@playwright/test').Page} page The page.
 * @param {object} options Shape of the run row.
 * @param {string} options.uuid The run's uuid, or '' for a row carrying none.
 * @return {Promise<void>}
 */
async function stubOpenRegister(page, { uuid = RUN_UUID } = {}) {
	// The widget's own list. It reads `/flow-runs/active`, NOT `/flow-runs`:
	// a stub on the latter matches nothing and presents as a widget with no
	// rows, which is indistinguishable from a widget that failed to render.
	await page.route('**/apps/openregister/api/flow-runs/active**', (route) => {
		route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({
				results: [{
					uuid,
					flowId: FLOW_ID,
					flowName: 'Mandaatbesluit, verkorte route',
					status: 'completed',
					trigger: 'manual',
					startedBy: 'alice',
					created: new Date(Date.now() - 9 * 60 * 1000).toISOString(),
				}],
				total: 1,
			}),
		})
	})

	// The flow the route lands on. Answered as a LIST because that is what
	// `open()` reads from.
	await page.route('**/apps/openregister/api/flows?**', (route) => {
		route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({
				results: [{
					id: FLOW_ID,
					uuid: FLOW_ID,
					app: 'openregister',
					name: 'Mandaatbesluit, verkorte route',
					version: 4,
					lifecycleStatus: 'draft',
					nodes: [{ id: 'start', type: 'openregister.trigger-manual', position: { x: 40, y: 60 }, name: 'Manual start' }],
					edges: [],
				}],
				total: 1,
			}),
		})
	})

	await page.route(`**/apps/openregister/api/flow-runs/${RUN_UUID}`, (route) => {
		route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({
				uuid: RUN_UUID,
				flowId: FLOW_ID,
				flowVersion: RUN_VERSION,
				status: 'completed',
				log: [{ transition: 'start', status: 'completed' }],
			}),
		})
	})

	await page.route(`**/apps/openregister/api/flows/${FLOW_ID}/versions/${RUN_VERSION}`, (route) => {
		route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({
				version: RUN_VERSION,
				graph: {
					nodes: [
						{ id: 'start', type: 'openregister.trigger-manual', position: { x: 40, y: 60 }, name: 'Manual start' },
						{ id: 'since-deleted', type: 'openregister.action-mail', position: { x: 260, y: 60 }, name: SINCE_DELETED },
					],
					edges: [{ id: 'e-v2', source: 'start', target: 'since-deleted' }],
				},
			}),
		})
	})

	// Named precisely so neither shadows the run's own record above: a
	// later-registered Playwright route wins.
	await page.route('**/apps/openregister/api/flow-runs/*/objects**', (route) => {
		route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ results: [], total: 0 }) })
	})
	await page.route('**/apps/openregister/api/flow-tasks**', (route) => {
		route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ results: [], total: 0 }) })
	})
	// Catalogues, so the destination canvas is not covered by a warning card.
	await page.route('**/apps/openregister/api/flow-nodes**', (route) => {
		route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ results: [] }) })
	})
}

test.describe('the run deep link, all the way through', () => {
	test('clicking a run routes to its flow with the run in the query', async ({ page }) => {
		await stubOpenRegister(page)
		await page.goto(HARNESS)

		const row = page.locator('[data-testid="runlink-widget"] .cn-flow-runs-widget__row').first()
		await expect(row, 'the widget must have a row before it can be clicked').toBeVisible()

		await row.click()

		// The URL is the assertion. The flow id in the path says the click
		// found the right flow; the run in the query is what was missing and
		// is the whole point of the fix.
		await expect(page).toHaveURL(new RegExp(`#/flows/${FLOW_ID}\\?run=${RUN_UUID}$`))
	})

	/**
	 * ⚠️ THE ONE THAT MATTERS. The link resolving is not the same fact as the
	 * run opening: before this, the URL could have carried a run and the page
	 * would still have shown the flow's current graph with nothing selected.
	 */
	test('the flow that opens has that run inspected, not merely open', async ({ page }) => {
		await stubOpenRegister(page)
		await page.goto(HARNESS)

		await page.locator('[data-testid="runlink-widget"] .cn-flow-runs-widget__row').first().click()

		// The step that only exists on the version this run executed. Its
		// presence proves the run reached the flow page AND that the page
		// pinned the graph to the run's version.
		await expect(page.locator('[data-testid="runlink-page"] .cn-flow-detail__node-label', { hasText: SINCE_DELETED })).toBeVisible()

		// And the canvas says which version, so the reader is not left to
		// infer it from a step they may not recognise.
		await expect(page.locator('[data-testid="flow-message-viewing-version"]')).toContainText(String(RUN_VERSION))
	})

	test('a row with no run uuid still opens the flow, with no empty ?run=', async ({ page }) => {
		await stubOpenRegister(page, { uuid: '' })
		await page.goto(HARNESS)

		await page.locator('[data-testid="runlink-widget"] .cn-flow-runs-widget__row').first().click()

		// The old behaviour, unchanged and still reachable: the flow opens.
		await expect(page).toHaveURL(new RegExp(`#/flows/${FLOW_ID}$`))
		await expect(page).not.toHaveURL(/run=/)
	})
})
