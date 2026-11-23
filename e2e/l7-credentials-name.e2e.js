// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// The credentials section names the app, not its id (?l7=credentials-name,
// harness l7/CredentialsName.vue). The user settings dialog read
// "What launchpad uses" for an app that passes no display name.
//
// WHY PLAYWRIGHT: the name comes from Nextcloud's initial state in the page
// (`#initial-state-core-apps`), read by the real @nextcloud/initial-state.

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

/**
 * @param {import('@playwright/test').Page} page The page.
 */
async function stub(page) {
	await page.route('**/apps/openregister/api/credentials**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ results: [] }) }))
}

test('without a name in the app menu the id gets a capital', async ({ page }) => {
	await stub(page)
	await page.goto('/?l7=credentials-name', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const title = page.locator('[data-testid="credentials-name"] .cn-credentials__supports .cn-credentials__section-title')
	await title.waitFor({ state: 'visible', timeout: 60_000 })
	await expect(title).toHaveText('What Launchpad uses')
})

test('the name in the Nextcloud app menu is used', async ({ page }) => {
	await stub(page)
	await page.addInitScript(() => {
		const add = () => {
			const input = document.createElement('input')
			input.type = 'hidden'
			input.id = 'initial-state-core-apps'
			input.value = btoa(JSON.stringify([{ id: 'files', name: 'Files', type: 'link' }, { id: 'launchpad', app: 'launchpad', name: 'Startpagina', type: 'link' }]))
			document.body.appendChild(input)
		}
		if (document.body) {
			add()
		} else {
			document.addEventListener('DOMContentLoaded', add)
		}
	})
	await page.goto('/?l7=credentials-name', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const title = page.locator('[data-testid="credentials-name"] .cn-credentials__supports .cn-credentials__section-title')
	await title.waitFor({ state: 'visible', timeout: 60_000 })
	await expect(title).toHaveText('What Startpagina uses')
})
