// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// `searchPlacement: "toolbar"` (?l8=queue-search-toolbar): the search field
// sits on the same row as the Filter button, before it, and takes the room
// the buttons leave (DqTeamwachtrij).
//
// WHY PLAYWRIGHT: the claim is the rendered row.
//
// @spec openspec/changes/index-search-on-toolbar/specs/index-page/spec.md#requirement-the-search-field-can-sit-on-the-toolbar-row

import { expect, test } from '@playwright/test'

test.describe.configure({ timeout: 120_000 })

test('the search field sits on the toolbar row', async ({ page }) => {
	await page.goto('/?l8=queue-search-toolbar', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const root = page.locator('[data-testid="queue-search-toolbar"]')
	const search = root.locator('.cn-actions-bar__search input')
	await search.waitFor({ state: 'visible', timeout: 60_000 })
	const s = await search.boundingBox()
	const f = await root.locator('[data-testid="cn-actions-bar-filter-button"]').boundingBox()
	expect(Math.abs((s.y + s.height / 2) - (f.y + f.height / 2))).toBeLessThanOrEqual(4)
	expect(s.x + s.width).toBeLessThanOrEqual(f.x)
	expect(s.width).toBeGreaterThanOrEqual(220)
})
