// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// A view switch segment that opens another page (?l7=view-switch-link,
// harness l7/ViewSwitchLink.vue). The boards draw table, cards, board and map
// in one switch, but a board or a map is often a page of its own: that
// segment was drawn disabled. With `viewSwitchLinks` it is a link in the same
// 40 by 34px box, beside the in-place segments.
//
// WHY PLAYWRIGHT: the box and the row are layout, and the click navigates.

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test('the Board segment is a link in the switch, the same box as its neighbours', async ({ page }) => {
	await page.goto('/?l7=view-switch-link', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const toggle = page.locator('[data-testid="view-switch-link"] .cn-actions-bar__view-toggle')
	await toggle.waitFor({ state: 'visible', timeout: 60_000 })

	const info = await toggle.evaluate((el) => [...el.querySelectorAll('.cn-actions-bar__view-toggle-btn')].map((seg) => {
		const box = seg.getBoundingClientRect()
		return { mode: seg.getAttribute('data-mode'), tag: seg.tagName, width: Math.round(box.width), height: Math.round(box.height), top: Math.round(box.top), disabled: seg.disabled === true, underline: getComputedStyle(seg).textDecorationLine }
	}))
	expect(info.map((seg) => seg.mode)).toEqual(['table', 'cards', 'kanban', 'map'])
	const board = info[2]
	expect(board.tag).toBe('A')
	expect(board.disabled).toBe(false)
	expect(board.underline).toBe('none')
	expect({ width: board.width, height: board.height, top: board.top }).toEqual({ width: info[0].width, height: info[0].height, top: info[0].top })
	expect(board.width).toBe(40)
	expect(board.height).toBe(34)
	// The map is still a segment the page cannot open.
	expect(info[3].tag).toBe('BUTTON')
	expect(info[3].disabled).toBe(true)

	const link = toggle.locator('[data-testid="cn-actions-bar-view-link"]')
	await expect(link).toHaveAttribute('href', '#/zaken/bord')
	await expect(link).toHaveAttribute('aria-label', 'Board')
	await link.click()
	await expect(page).toHaveURL(/#\/zaken\/bord$/)
	// The in-place segments still switch.
	await toggle.locator('[data-mode="cards"]').click()
	await expect(toggle.locator('[data-mode="cards"]')).toHaveAttribute('aria-pressed', 'true')
})
