// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// The `avatar` cell widget in a board table (PtAccounts "Naam"), measured in a
// browser: the e-mail (the column's `secondary`) sits under the name BESIDE the
// 32px initials circle, not under the whole cell, and the name keeps the plain
// title style (15px, weight 700, no underline) of a normal title cell.
//
// WHY PLAYWRIGHT: x positions, weights and underlines are layout and computed
// style; jsdom resolves neither.

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test('an avatar name cell stacks the e-mail under the name, beside the circle', async ({ page }) => {
	await page.goto('/?ptaccounts=1', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const cell = page.locator('[data-testid="pt-accounts"] tbody tr').first().locator('td.cn-table-col--title')
	await cell.waitFor({ state: 'visible', timeout: 60_000 })

	const info = await cell.evaluate((td) => {
		const circle = td.querySelector('.cn-cell-renderer__avatar-initials').getBoundingClientRect()
		const name = td.querySelector('.cn-cell-renderer__avatar-name')
		const nameBox = name.getBoundingClientRect()
		const secondary = td.querySelector('.cn-cell-renderer__avatar-secondary')
		const secondaryBox = secondary.getBoundingClientRect()
		const nameStyle = getComputedStyle(name)
		return {
			circleWidth: Math.round(circle.width),
			circleRight: circle.right,
			nameLeft: nameBox.left,
			secondaryLeft: secondaryBox.left,
			secondaryTop: secondaryBox.top,
			nameBottom: nameBox.bottom,
			circleMid: circle.top + circle.height / 2,
			stackMid: (nameBox.top + secondaryBox.bottom) / 2,
			nameWeight: Number(nameStyle.fontWeight),
			nameSize: nameStyle.fontSize,
			nameUnderline: nameStyle.textDecorationLine,
			secondarySize: getComputedStyle(secondary).fontSize,
			secondaryText: secondary.textContent.trim(),
			duplicate: td.querySelectorAll('.cn-table-cell__secondary').length,
		}
	})

	expect(info.circleWidth).toBe(32)
	// The name and the e-mail start at the same x, 10px after the circle.
	expect(Math.round(info.secondaryLeft)).toBe(Math.round(info.nameLeft))
	expect(Math.round(info.nameLeft - info.circleRight)).toBe(10)
	// The e-mail is under the name, and the circle is centred on the pair.
	expect(info.secondaryTop).toBeGreaterThanOrEqual(info.nameBottom - 1)
	expect(Math.abs(info.circleMid - info.stackMid)).toBeLessThan(3)
	expect(info.secondaryText).toBe('m.dewit@oosthaven.nl')
	expect(info.secondarySize).toBe('13px')
	// Drawn once: not again under the whole cell.
	expect(info.duplicate).toBe(0)
	// The name keeps the plain-title style.
	expect(info.nameWeight).toBe(700)
	expect(info.nameSize).toBe('15px')
	expect(info.nameUnderline).toBe('none')
})

// Board PtAccounts draws the row 59px high: 12px above and under the 32px
// circle and its two lines, and a 1px hairline. The host's line height must
// not change that: Nextcloud sets 1.5 on the body, which made the row 82px.
for (const hostLineHeight of ['normal', '1.5']) {
	test(`a two-line avatar row is 59px high (host line-height ${hostLineHeight})`, async ({ page }) => {
		await page.goto('/?ptaccounts=1', { waitUntil: 'domcontentloaded', timeout: 90_000 })
		await page.addStyleTag({ content: `body { line-height: ${hostLineHeight}; }` })
		const row = page.locator('[data-testid="pt-accounts"] tbody tr').first()
		await row.waitFor({ state: 'visible', timeout: 60_000 })
		const info = await row.evaluate((tr) => {
			const td = tr.querySelector('td.cn-table-col--title')
			const circle = td.querySelector('.cn-cell-renderer__avatar-initials').getBoundingClientRect()
			const cell = td.getBoundingClientRect()
			return {
				rowHeight: Math.round(tr.getBoundingClientRect().height),
				circle: Math.round(circle.height),
				above: Math.round(circle.top - cell.top),
				textHeight: Math.round(td.querySelector('.cn-cell-renderer__avatar-text').getBoundingClientRect().height),
			}
		})
		expect(info.circle).toBe(32)
		expect(info.textHeight).toBe(34)
		expect(info.rowHeight).toBe(59)
		// The circle is centred on the two lines: 12px padding, a 1px hairline, 1px of the 34px pair.
		expect(info.above).toBeGreaterThanOrEqual(13)
		expect(info.above).toBeLessThanOrEqual(15)
	})
}
