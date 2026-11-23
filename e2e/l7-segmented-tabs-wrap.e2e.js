// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// Under the board look no tab strip scrolls sideways
// (?l7=segmented-tabs-wrap, harness l7/SegmentedTabsWrap.vue). #1529 wrapped
// the line strip; dossiq's case page uses a segmented strip, which still drew
// its 13 tabs as a 1669px scroller in a 686px card.
//
// WHY PLAYWRIGHT: wrapping and overflow are layout. The look's stylesheets are
// put first in the head, as the built library ships them.

import { expect, test } from '@playwright/test'
import fs from 'fs'

const BOARD_CSS = ['src/css/look-board.css', 'src/css/look-board-detail.css']
	.map((file) => fs.readFileSync(file, 'utf8'))
	.join('\n')

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test('a segmented strip of 13 tabs wraps inside a 686px card', async ({ page }) => {
	await page.goto('/?l7=segmented-tabs-wrap', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const nav = page.locator('[data-testid="segmented-tabs-wrap"] .cn-tabs__nav')
	await nav.waitFor({ state: 'visible', timeout: 60_000 })
	await page.evaluate((text) => {
		const style = document.createElement('style')
		style.textContent = text
		document.head.prepend(style)
	}, BOARD_CSS)
	await expect(page.locator('[data-testid="segmented-tabs-wrap"] .cn-tabs--segmented')).toHaveCount(1)
	const info = await nav.evaluate((el) => {
		const host = el.closest('[data-testid="segmented-tabs-wrap"]').getBoundingClientRect()
		const tabs = [...el.querySelectorAll('.cn-tabs__nav-item')].map((tab) => tab.getBoundingClientRect())
		return {
			scrolls: el.scrollWidth > el.clientWidth + 1,
			rows: new Set(tabs.map((box) => Math.round(box.top))).size,
			rightmost: Math.max(...tabs.map((box) => box.right)),
			hostRight: host.right,
			count: tabs.length,
		}
	})
	expect(info.count).toBe(13)
	expect(info.scrolls).toBe(false)
	expect(info.rows).toBeGreaterThan(1)
	expect(info.rightmost).toBeLessThanOrEqual(info.hostRight + 1)
	await expect(page.locator('[data-testid="segmented-tabs-wrap"] .cn-tabs__scroll')).toHaveCount(0)
})
