// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// Real-browser coverage for deleting a schema from CnEditDataModal ("Manage data").
//
// Both bugs this pins were reported from the LIVE UI and neither is reachable in
// jsdom the way a user hits them:
//
//   1. The confirmation read “%s” still has 1 object. Nextcloud's l10n substitutes
//      %n for the plural count and {named} placeholders from a vars OBJECT — it has
//      no printf %s — so the raw placeholder was rendered to the user.
//
//   2. Confirming the cascade re-opened the SAME confirmation, forever. An
//      OpenRegister too old to know `?deleteObjects=true` ignores the flag and
//      answers 409 exactly as before; the catch block re-armed the prompt on that,
//      so the user could confirm a destructive action that never landed, endlessly.
//
// OpenRegister is stubbed at the network layer, so the real dialog runs against real
// HTTP responses.

import { test, expect } from '@playwright/test'

const REGISTER = {
	id: 2466,
	slug: 'harness-register',
	title: 'Harness register',
	schemas: [4432, 4434],
}

const SCHEMAS = {
	4432: { id: 4432, slug: 'hello-message', title: 'Hello Message', properties: {} },
	4434: { id: 4434, slug: 'cow', title: 'Cow', properties: { name: { type: 'string' } } },
}

const json = (route, body, status = 200) => route.fulfill({
	status,
	contentType: 'application/json',
	body: JSON.stringify(body),
})

/**
 * Stub OpenRegister. `onDelete` decides what the schema DELETE does, so each test
 * can model a different server: one that supports the cascade, and one that does not.
 *
 * @param {import('@playwright/test').Page} page The page.
 * @param {Function} onDelete Receives ({ route, url, cascade }) for a schema DELETE.
 * @return {Promise<{deleteCalls: string[]}>} Records every schema-DELETE url.
 */
async function stubOpenRegister(page, onDelete) {
	const deleteCalls = []

	await page.route('**/apps/openregister/api/registers**', (route) => {
		if (route.request().method() === 'GET') return json(route, { results: [REGISTER] })
		return json(route, REGISTER) // PATCH — unlink
	})

	await page.route('**/apps/openregister/api/schemas/**', (route) => {
		const url = route.request().url()
		const method = route.request().method()

		if (method === 'DELETE') {
			deleteCalls.push(url)
			return onDelete({ route, url, cascade: url.includes('deleteObjects=true') })
		}
		const id = url.split('?')[0].split('/').pop()
		return json(route, SCHEMAS[id] || {})
	})

	return { deleteCalls }
}

const dialog = (page) => page.locator('.cn-edit-data')
const confirmBox = (page) => page.locator('.cn-edit-data__confirm')
const errorBox = (page) => page.locator('.cn-edit-data__error')

/**
 * Open the modal and start deleting "Cow".
 *
 * @param {import('@playwright/test').Page} page The page.
 * @return {Promise<void>} Resolves once the remove button has been clicked.
 */
async function startDeletingCow(page) {
	await page.goto('/?sd=1')
	await expect(dialog(page)).toBeVisible()

	const row = page.locator('.cn-edit-data__row', { hasText: 'Cow' })
	await expect(row).toBeVisible()
	await row.getByRole('button', { name: 'Remove schema' }).click()
}

test.describe('CnEditDataModal — deleting a schema that still has objects', () => {
	test('names the schema in the confirmation — never a raw “%s” placeholder', async ({ page }) => {
		await stubOpenRegister(page, ({ route }) =>
			json(route, { error: 'schema-has-objects', objectCount: 1 }, 409))

		await startDeletingCow(page)

		const box = confirmBox(page)
		await expect(box).toBeVisible()

		// The bug, exactly as reported: “%s” still has 1 object.
		await expect(box).toContainText('Cow')
		await expect(box).not.toContainText('%s')
		await expect(box).not.toContainText('{name}')

		// The count reaches both the warning and the button.
		await expect(box).toContainText('1 object')
		await expect(box.getByRole('button', { name: /Delete schema and 1 object/i })).toBeVisible()
	})

	test('confirming runs the cascade, and the register is only unlinked once it lands', async ({ page }) => {
		let deleted = false
		const { deleteCalls } = await stubOpenRegister(page, ({ route, cascade }) => {
			if (!cascade) return json(route, { error: 'schema-has-objects', objectCount: 1 }, 409)
			deleted = true
			return json(route, { success: true, deletedCount: 1, tableDropped: true })
		})

		await startDeletingCow(page)
		await confirmBox(page).getByRole('button', { name: /Delete schema and 1 object/i }).click()

		await expect.poll(() => deleted).toBe(true)
		expect(deleteCalls.some((u) => u.includes('deleteObjects=true'))).toBe(true)
		// force ORPHANS the objects — it must never be sent from the UI.
		expect(deleteCalls.some((u) => u.includes('force'))).toBe(false)

		await expect(confirmBox(page)).toBeHidden()
	})

	test('cancelling destroys nothing and closes the prompt', async ({ page }) => {
		const { deleteCalls } = await stubOpenRegister(page, ({ route }) =>
			json(route, { error: 'schema-has-objects', objectCount: 1 }, 409))

		await startDeletingCow(page)
		await confirmBox(page).getByRole('button', { name: /^Cancel$/ }).click()

		await expect(confirmBox(page)).toBeHidden()
		expect(deleteCalls.filter((u) => u.includes('deleteObjects=true'))).toHaveLength(0)
	})

	// THE LOOP. A server that does not know the cascade flag answers 409 again.
	test('a cascade that still reports objects errors out — it must NOT re-prompt', async ({ page }) => {
		// This server ignores ?deleteObjects=true — i.e. an OpenRegister predating it.
		const { deleteCalls } = await stubOpenRegister(page, ({ route }) =>
			json(route, { error: 'schema-has-objects', objectCount: 1 }, 409))

		await startDeletingCow(page)
		await confirmBox(page).getByRole('button', { name: /Delete schema and 1 object/i }).click()

		// The prompt must be GONE — not sitting there inviting the same doomed click.
		await expect(confirmBox(page)).toBeHidden()
		await expect(errorBox(page)).toBeVisible()

		// Exactly two deletes: the plain one, and the one cascade attempt. No loop.
		await expect.poll(() => deleteCalls.length).toBe(2)
	})
})
