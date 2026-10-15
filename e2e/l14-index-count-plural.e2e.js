// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// The count line under an index title takes its singular form for one record
// and its plural form for more (?l7=index-count-plural, harness
// l7/IndexCountPlural.vue), so shillinq's invoice list of one reads
// "1 factuur", not "1 facturen".

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test('one invoice reads singular, twelve read plural', async ({ page }) => {
	await page.goto('/?l7=index-count-plural', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const one = page.locator('[data-testid="count-one"]')
	const many = page.locator('[data-testid="count-many"]')
	await one.waitFor({ state: 'visible', timeout: 60_000 })
	await expect(one).toContainText('1 factuur')
	await expect(one).not.toContainText('1 facturen')
	await expect(many).toContainText('12 facturen')
})
