// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// A proxied Nextcloud widget that CANNOT serve items must say so, rather than
// claiming the reader has nothing.
//
// The Tasks app's dashboard widget implements only `IWidget`. It declares
// `itemApiVersions: []`, and the OCS widget-items response simply has no key
// for it. With no native callback on the page, CnNcWidgetWidget used to render
// "No items available" under it, which on a case handler's dashboard read as
// "you have no tasks" while five were due. Measured on the dev instance while
// building that dashboard: the same list appeared the moment LaunchPad's
// legacy widget bridge was switched on.
//
// The unit lane pins the branch logic. This spec pins it against the response
// shapes crossing a real network boundary, stubbed with the exact payloads a
// Nextcloud 34 instance returned.

import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
	await page.route('**/apps/dashboard/api/v2/widget-items**', async (route) => {
		const url = new URL(route.request().url())
		const asked = url.searchParams.getAll('widgets[]').concat(url.searchParams.getAll('widgets[0]'))
		// Tasks: absent from the response, as on a real instance (`data: []`).
		// Mail: present, with an empty inbox.
		const data = asked.includes('mail')
			? { mail: { items: [], emptyContentMessage: 'No message found yet' } }
			: []
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({ ocs: { meta: { status: 'ok', statuscode: 200 }, data } }),
		})
	})
	await page.goto('/?ncproxy=1')
})

test.describe('CnNcWidgetWidget: a widget that cannot be shown vs a widget with nothing to show', () => {
	test('a widget the items API does not know says it can only be shown on the dashboard', async ({ page }) => {
		const tasks = page.getByTestId('ncproxy-tasks')
		await expect(tasks.getByTestId('nc-widget-unsupported')).toBeVisible({ timeout: 15_000 })
		await expect(tasks).toContainText('can only be shown on the Nextcloud dashboard')
		await expect(tasks).not.toContainText('No items available')
	})

	test('a widget that answers with an empty list still says it has no items', async ({ page }) => {
		const mail = page.getByTestId('ncproxy-mail')
		await expect(mail).toContainText('No items available', { timeout: 15_000 })
		await expect(mail.getByTestId('nc-widget-unsupported')).toHaveCount(0)
	})
})
