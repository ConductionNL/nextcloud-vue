/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The tasks inbox surfaces, offline (cn-tasks-entity-source).
 *
 * Every OpenRegister read and verb is intercepted with page.route, so the
 * rows, the total and the claim refusal are deterministic. What these specs
 * pin is the HONESTY of the surfaces, in a real browser:
 *
 * Spec scenarios covered (openspec/changes/cn-tasks-entity-source/specs/
 * cn-tasks-entity-source/spec.md):
 *  - @e2e the tasks index renders the mocked inbox rows
 *  - @e2e switching to the pool tab lists the pooled task
 *  - @e2e the tasks index shows no Add button
 *  - @e2e the widget states the mocked total above its rows
 *  - @e2e claiming the pooled task posts the claim and refreshes the list
 *  - @e2e the refused claim surfaces the server's message
 */
import { test, expect } from '@playwright/test'

/**
 * One task row as the flow-tasks read returns it.
 *
 * @param {object} overrides Fields to override.
 * @return {object} The row.
 */
function row(overrides = {}) {
	return {
		uuid: 'task-1',
		displayTitle: 'Beoordeel offerte serverhal',
		state: 'active',
		isTerminal: false,
		priority: 'high',
		assignee: 'alice',
		subject: { uuid: 'o-1', register: 'dossiq', schema: 'case', title: 'Dossier 12' },
		dueAt: '2026-09-04T17:00:00+02:00',
		overdue: false,
		daysUntilDue: 3,
		daysOverdue: null,
		...overrides,
	}
}

const pooled = () => row({
	uuid: 'task-2',
	displayTitle: 'Vraag aanvullende stukken op',
	state: 'enabled',
	assignee: null,
	priority: 'normal',
	overdue: true,
	daysOverdue: 2,
	daysUntilDue: null,
})

test.describe('the tasks index page (entitySource: "tasks")', () => {
	test.beforeEach(async ({ page }) => {
		await page.route('**/apps/openregister/api/flow-tasks**', (route) => {
			const url = new URL(route.request().url())
			const scope = url.searchParams.get('scope') || 'assigned'
			const results = scope === 'pooled' ? [pooled()] : [row()]
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ results, total: results.length, limit: 25, offset: 0 }),
			})
		})
	})

	test('renders the mocked inbox rows with state and due in words', async ({ page }) => {
		await page.goto('/?tasksIndex=1')
		await expect(page.getByText('Beoordeel offerte serverhal')).toBeVisible()
		await expect(page.getByText('In progress')).toBeVisible()
		await expect(page.getByText('Due in 3 days')).toBeVisible()
	})

	test('switching to the pool tab lists the pooled task', async ({ page }) => {
		await page.goto('/?tasksIndex=1')
		await expect(page.getByText('Beoordeel offerte serverhal')).toBeVisible()

		const poolRequest = page.waitForRequest((request) => request.url().includes('scope=pooled'))
		await page.getByRole('tab', { name: 'Pool' }).click()
		await poolRequest

		await expect(page.getByText('Vraag aanvullende stukken op')).toBeVisible()
		await expect(page.getByText('Overdue by 2 days')).toBeVisible()
		await expect(page.getByText('Beoordeel offerte serverhal')).not.toBeVisible()
	})

	test('shows no Add button: a task is created by a flow', async ({ page }) => {
		await page.goto('/?tasksIndex=1')
		await expect(page.getByText('Beoordeel offerte serverhal')).toBeVisible()
		await expect(page.getByRole('button', { name: /^(Add|New|Create)/ })).toHaveCount(0)
	})
})

test.describe('the tasks widget', () => {
	test('states the mocked total above its rows, and the remainder', async ({ page }) => {
		await page.route('**/apps/openregister/api/flow-tasks**', (route) => route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({ results: [row(), pooled()], total: 12, limit: 2, offset: 0 }),
		}))

		await page.goto('/?tasksWidget=1')
		await expect(page.getByText('12 open tasks')).toBeVisible()
		await expect(page.getByText('+10 more')).toBeVisible()
	})

	test('claiming the pooled task posts the claim and refreshes the list', async ({ page }) => {
		let claimed = false
		// The list catch-all is registered FIRST: Playwright matches routes
		// last-registered first, so the more specific claim route must come
		// after it or the catch-all swallows the POST.
		await page.route('**/apps/openregister/api/flow-tasks**', (route) => {
			const results = claimed ? [row({ uuid: 'task-2', displayTitle: 'Vraag aanvullende stukken op', assignee: 'viewer' })] : [pooled()]
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ results, total: 1, limit: 2, offset: 0 }),
			})
		})
		await page.route('**/apps/openregister/api/flow-tasks/task-2/claim', (route) => {
			claimed = true
			route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(pooled()) })
		})

		await page.goto('/?tasksWidget=1')
		await expect(page.getByText('Vraag aanvullende stukken op')).toBeVisible()

		await page.getByRole('button', { name: 'Task actions' }).click()
		const claimPost = page.waitForRequest((request) => request.method() === 'POST' && request.url().includes('/task-2/claim'))
		await page.getByRole('menuitem', { name: 'Claim' }).click()
		await claimPost

		// The refetch after the verb re-renders from the post-claim payload.
		await expect.poll(() => claimed).toBe(true)
	})

	test('a refused claim surfaces the server\'s message', async ({ page }) => {
		const refusal = "Task 'task-2' was not claimable: another claim won, or the task is no longer open."
		await page.route('**/apps/openregister/api/flow-tasks**', (route) => route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({ results: [pooled()], total: 1, limit: 2, offset: 0 }),
		}))
		// After the catch-all: the last-registered route wins the match.
		await page.route('**/apps/openregister/api/flow-tasks/task-2/claim', (route) => route.fulfill({
			status: 409,
			contentType: 'application/json',
			body: JSON.stringify({ error: refusal }),
		}))

		await page.goto('/?tasksWidget=1')
		await expect(page.getByText('Vraag aanvullende stukken op')).toBeVisible()

		await page.getByRole('button', { name: 'Task actions' }).click()
		await page.getByRole('menuitem', { name: 'Claim' }).click()

		// The toast carries the SERVER'S words, never a swallowed refusal.
		await expect(page.getByText('another claim won')).toBeVisible()
	})
})
