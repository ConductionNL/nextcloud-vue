// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// An empty index page reads its empty state in Dutch for a Dutch reader
// (?l7=index-empty-dutch, harness l7/IndexEmptyDutch.vue), where shillinq's
// lists read "No items found".

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test('an empty list reads "Geen items gevonden"', async ({ page }) => {
	await page.goto('/?l7=index-empty-dutch', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const root = page.locator('[data-testid="index-empty-dutch"]')
	await root.waitFor({ state: 'visible', timeout: 60_000 })
	await expect(root).toContainText('Geen items gevonden', { timeout: 30_000 })
	await expect(root).not.toContainText('No items found')
})
