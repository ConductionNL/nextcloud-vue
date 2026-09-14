// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// Inspecting a run shows the graph that run actually executed.
//
// THE JOURNEY, END TO END
// -----------------------
// A caseworker clicks a run in the Flow runs widget on a case. The flow opens
// with that run inspected. What they are looking at must be the graph AS IT
// RAN, not the flow as it stands today: a flow's steps get added, renamed and
// deleted, and replaying an old run over the current canvas paints badges onto
// steps that did not exist when it ran while silently dropping the ones that
// have since been deleted.
//
// WHY IN A BROWSER AND NOT ONLY IN JEST
// -------------------------------------
// The store half is pinned in `useFlowStore.runVersion.spec.js`, including the
// save refusal. Three claims here are not store state and cannot be settled in
// jsdom:
//
// 1. THE CANVAS ACTUALLY REPAINTS. The store swapping `flow.nodes` is not the
//    same fact as the graph rendering the swapped nodes. The canvas keeps its
//    own node components keyed by id, and a stale key would leave the old
//    steps on screen with the new ones underneath.
// 2. SAVE IS UNREACHABLE, not merely flagged. `disabled` on an NcButton is a
//    rendered attribute, and "the user cannot press it" is what matters. This
//    is the control that would otherwise write a historic graph over the live
//    flow.
// 3. THE WAY BACK RESTORES THE CANVAS. `closeRun()` puts the stashed graph
//    back into the store; whether the rendered graph follows is a separate
//    question, and the one an author would notice.
//
// Every OpenRegister read is intercepted with page.route, so the run, its
// version and the stored graph are deterministic.
//
// Spec scenarios covered:
//  - @e2e inspecting a run repaints the canvas with the version it executed
//  - @e2e the canvas names the version being shown
//  - @e2e Save cannot be pressed while a stored version is on the canvas
//  - @e2e going back to the flow restores the live graph and re-enables Save

import { expect, test } from '@playwright/test'

const EDITOR = '/?flow=1'

/** The flow the harness opens, seeded through the store below. */
const FLOW_ID = 'flow-1'

/** The run under inspection, and the version it recorded. */
const RUN_UUID = 'run-1'
const RUN_VERSION = 1

/** On the LIVE graph only: a step added after the run finished. */
const ADDED_LATER = 'Added after the run'

/** On the STORED version only: a step deleted since the run. */
const SINCE_DELETED = 'Deleted since the run'

/** On both, so the assertions are about the difference and not about emptiness. */
const ALWAYS = 'Manual start'

/**
 * Answer every OpenRegister read this journey makes.
 *
 * The run's own record carries `flowVersion`, which is where the store reads
 * it from — deliberately not from the loaded run history, because a run
 * reached by `?run=` need not be in that capped page at all.
 *
 * @param {import('@playwright/test').Page} page The page.
 * @return {Promise<void>}
 */
async function stubOpenRegister(page) {
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
						{ id: 'start', type: 'openregister.trigger-manual', position: { x: 40, y: 60 }, name: ALWAYS },
						{ id: 'since-deleted', type: 'openregister.action-mail', position: { x: 260, y: 60 }, name: SINCE_DELETED },
					],
					edges: [{ id: 'e-v1', source: 'start', target: 'since-deleted' }],
				},
			}),
		})
	})

	// The run's objects and tasks are not under test. Answered empty so the
	// tail of inspectRun() resolves rather than rejecting and masking the
	// assertions above it.
	//
	// 🔴 NAMED PRECISELY, NOT AS `flow-runs/**`. That broader glob also matches
	// the run's OWN record above, and a later-registered route wins in
	// Playwright — so the run came back as `{results: []}` with no
	// `flowVersion`, the snapshot was never requested, and the failure
	// presented as the version graph not rendering. Non-overlapping patterns
	// state the intent instead of depending on registration order.
	await page.route('**/apps/openregister/api/flow-runs/*/objects**', (route) => {
		route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({ results: [], total: 0 }),
		})
	})

	await page.route('**/apps/openregister/api/flow-tasks**', (route) => {
		route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({ results: [], total: 0 }),
		})
	})
}

/**
 * Open the editor on a saved flow carrying the LIVE graph.
 *
 * Seeded through the store rather than the palette for the reason the harness
 * gives: dragging steps in would make every assertion here depend on
 * drag-and-drop first, so a failure there would surface in the wrong place.
 *
 * @param {import('@playwright/test').Page} page The page.
 * @return {Promise<void>}
 */
async function openFlowWithLiveGraph(page) {
	await page.goto(EDITOR)
	await page.locator('[data-testid="flow-box"]').waitFor()

	await page.evaluate(({ flowId, always, addedLater }) => {
		const store = window.__cnFlowStore
		store.flow = {
			id: flowId,
			name: 'Mandaatbesluit, verkorte route',
			app: 'openregister',
			version: 3,
			// DRAFT on purpose. A published flow is locked anyway, so it could
			// not tell a snapshot lock from the lock it already had — and a
			// draft is the case where an unguarded Save would really overwrite
			// the live flow with a historic graph.
			lifecycleStatus: 'draft',
			trigger: 'manual',
			nodes: [
				{ id: 'start', type: 'openregister.trigger-manual', position: { x: 40, y: 60 }, name: always },
				{ id: 'added-later', type: 'openregister.action-log', position: { x: 260, y: 60 }, name: addedLater },
			],
			edges: [{ id: 'e-live', source: 'start', target: 'added-later' }],
		}
		store.dirty = false
	}, { flowId: FLOW_ID, always: ALWAYS, addedLater: ADDED_LATER })

	// A precondition, named so it fails legibly: everything below is about the
	// graph CHANGING, which is meaningless if it never rendered.
	await expect(
		page.locator('.cn-flow-detail__node-label', { hasText: ADDED_LATER }),
		'the live graph must be on the canvas before a run is inspected',
	).toBeVisible()
}

/**
 * Inspect the run, the way arriving with `?run=` does.
 *
 * @param {import('@playwright/test').Page} page The page.
 * @return {Promise<void>}
 */
async function inspectRun(page) {
	await page.evaluate((uuid) => window.__cnFlowStore.inspectRun(uuid), RUN_UUID)
}

test.describe('a run shows the graph it ran on', () => {
	test.beforeEach(async ({ page }) => {
		await stubOpenRegister(page)
	})

	/**
	 * ⚠️ THE ONE THAT MATTERS.
	 */
	test('inspecting a run repaints the canvas with the version it executed', async ({ page }) => {
		await openFlowWithLiveGraph(page)

		await inspectRun(page)

		// The step that existed when it ran is drawn...
		await expect(page.locator('.cn-flow-detail__node-label', { hasText: SINCE_DELETED })).toBeVisible()
		// ...and the step added afterwards is GONE, not merely covered. This
		// is the half a store assertion cannot make: a stale node key would
		// leave it painted underneath.
		await expect(page.locator('.cn-flow-detail__node-label', { hasText: ADDED_LATER })).toHaveCount(0)
		// The step on both graphs stays, so the two above are a difference and
		// not a canvas that simply emptied.
		await expect(page.locator('.cn-flow-detail__node-label', { hasText: ALWAYS })).toBeVisible()
	})

	test('the canvas names the version being shown', async ({ page }) => {
		await openFlowWithLiveGraph(page)

		await inspectRun(page)

		const message = page.locator('[data-testid="flow-message-viewing-version"]')
		await expect(message).toBeVisible()
		// The number, because "a stored version" without saying which one
		// leaves the reader no way to check it against the run they clicked.
		await expect(message).toContainText(String(RUN_VERSION))
	})

	test('Save cannot be pressed while a stored version is on the canvas', async ({ page }) => {
		await openFlowWithLiveGraph(page)
		const save = page.locator('[data-testid="flow-save-button"] button, button[data-testid="flow-save-button"]').first()

		// Enabled to begin with: this flow is a saveable draft, so the
		// assertion after the inspect is about the snapshot and not about the
		// button being dead all along.
		await expect(save).toBeEnabled()

		await inspectRun(page)

		await expect(save).toBeDisabled()
	})

	test('going back to the flow restores the live graph and re-enables Save', async ({ page }) => {
		await openFlowWithLiveGraph(page)
		await inspectRun(page)
		await expect(page.locator('.cn-flow-detail__node-label', { hasText: SINCE_DELETED })).toBeVisible()

		await page.evaluate(() => window.__cnFlowStore.closeRun())

		await expect(page.locator('.cn-flow-detail__node-label', { hasText: ADDED_LATER })).toBeVisible()
		await expect(page.locator('.cn-flow-detail__node-label', { hasText: SINCE_DELETED })).toHaveCount(0)
		await expect(page.locator('[data-testid="flow-message-viewing-version"]')).toHaveCount(0)

		const save = page.locator('[data-testid="flow-save-button"] button, button[data-testid="flow-save-button"]').first()
		await expect(save).toBeEnabled()
	})
})
