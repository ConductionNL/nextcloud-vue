// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// board-card-quiet: under the board look a card's title is dark and plain even
// under a theme that colours and underlines every link with !important
// (thematiq), and the selection checkbox shows only on a hovered or focused
// card, or on every card once one is selected (board DqWerkbord draws none).
//
// WHY PLAYWRIGHT: computed colour, text decoration, width and opacity, and a
// real hover and Tab.
//
// @spec openspec/changes/board-card-quiet/specs/board-view/spec.md

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test('board cards: a dark plain title and a checkbox only when asked for', async ({ page }) => {
	await page.setViewportSize({ width: 1100, height: 800 })
	await page.goto('/?l8=board-card-quiet', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const root = page.locator('[data-testid="board-card-quiet"]')
	const title = root.locator('[data-testid="cn-board-card-open"]').first()
	await expect(title).toBeVisible({ timeout: 90_000 })

	const look = await title.evaluate((el) => {
		const style = getComputedStyle(el)
		const probe = document.createElement('span')
		probe.style.color = 'var(--color-main-text)'
		el.parentElement.appendChild(probe)
		const ink = getComputedStyle(probe).color
		probe.remove()
		return { color: style.color, decoration: style.textDecorationLine, ink }
	})
	expect(look.decoration).toBe('none')
	expect(look.color).toBe(look.ink)
	expect(look.color).not.toBe('rgb(0, 0, 238)')

	const firstCard = root.locator('[data-testid="cn-board-card"]').first()
	const lastCard = root.locator('[data-testid="cn-board-card"]').last()
	const box = (card) => card.locator('[data-testid="cn-board-card-select"]').evaluate((el) => ({ width: el.getBoundingClientRect().width, opacity: getComputedStyle(el).opacity }))

	await page.mouse.move(0, 0)
	expect(await box(firstCard)).toEqual({ width: 0, opacity: '0' })

	await firstCard.hover()
	expect(await box(firstCard)).toEqual({ width: 16, opacity: '1' })
	await page.mouse.move(0, 0)

	await lastCard.locator('[data-testid="cn-board-card-select"]').focus()
	expect(await box(lastCard)).toEqual({ width: 16, opacity: '1' })
	await page.keyboard.press('Space')
	await page.mouse.move(0, 0)
	await page.evaluate(() => document.activeElement.blur())

	await expect(root.locator('[data-testid="cn-board-view"]')).toHaveClass(/cn-board-view--selecting/)
	expect(await box(firstCard)).toEqual({ width: 16, opacity: '1' })
})
