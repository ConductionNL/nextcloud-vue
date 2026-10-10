// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// Column header affordances on CnDataTable: every sortable header shows a sort
// chevron (pale while unsorted, dark and pointing in the sort direction once
// sorted) and every filterable header a filter funnel right after it (muted,
// or primary with a dot while a filter is set). Colours and positions are
// layout facts, which jsdom does not compute, so they are measured here.

import { expect, test } from '@playwright/test'

const URL = '/?dtheader=1'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

/**
 * Open the harness and wait for the header row.
 *
 * @param {import('@playwright/test').Page} page The page.
 * @return {Promise<void>} Resolves once the table header is visible.
 */
async function openHarness(page) {
	await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 90_000 })
	await page.locator('[data-testid="dt-header"] thead').waitFor({ state: 'visible', timeout: 60_000 })
}

/**
 * The header cell whose text includes `label`.
 *
 * @param {import('@playwright/test').Page} page The page.
 * @param {string} label The column label.
 * @return {import('@playwright/test').Locator} The th.
 */
const header = (page, label) => page.locator('[data-testid="dt-header"] th', { hasText: label })

test.describe('CnDataTable header affordances', () => {
	test('the sorted column has a dark chevron and aria-sort, the others a pale one', async ({ page }) => {
		await openHarness(page)
		await expect(header(page, 'Statutory term')).toHaveAttribute('aria-sort', 'descending')
		await expect(header(page, 'Case')).not.toHaveAttribute('aria-sort', /.+/)

		const look = await page.evaluate(() => {
			const th = (label) => [...document.querySelectorAll('[data-testid="dt-header"] th')].find((n) => n.textContent.includes(label))
			const style = (el) => {
				const cs = getComputedStyle(el)
				return { color: cs.color, opacity: Number(cs.opacity), width: el.getBoundingClientRect().width }
			}
			return {
				active: style(th('Statutory term').querySelector('.cn-table-header__chevron')),
				idle: style(th('Case').querySelector('.cn-table-header__chevron')),
				noteHasChevron: !!th('Note').querySelector('.cn-table-header__chevron'),
			}
		})
		expect(look.active.width).toBeGreaterThan(0)
		expect(look.idle.width).toBeGreaterThan(0)
		expect(look.active.opacity).toBe(1)
		expect(look.idle.opacity).toBeLessThan(1)
		expect(look.active.color).not.toBe(look.idle.color)
		expect(look.noteHasChevron).toBe(false)
	})

	test('the filter funnel sits directly after the chevron, on the same line', async ({ page }) => {
		await openHarness(page)
		const gap = await page.evaluate(() => {
			const th = [...document.querySelectorAll('[data-testid="dt-header"] th')].find((n) => n.textContent.includes('Case'))
			const chevron = th.querySelector('.cn-table-header__chevron').getBoundingClientRect()
			const filter = th.querySelector('.cn-table-header__filter').getBoundingClientRect()
			return {
				horizontal: Math.round(filter.left - chevron.right),
				centreOffset: Math.abs((filter.top + filter.height / 2) - (chevron.top + chevron.height / 2)),
			}
		})
		expect(gap.horizontal).toBeGreaterThanOrEqual(0)
		expect(gap.horizontal).toBeLessThanOrEqual(12)
		expect(gap.centreOffset).toBeLessThanOrEqual(2)
	})

	test('an active filter is coloured differently and carries a dot', async ({ page }) => {
		await openHarness(page)
		const filters = await page.evaluate(() => {
			const th = (label) => [...document.querySelectorAll('[data-testid="dt-header"] th')].find((n) => n.textContent.includes(label))
			const button = (label) => th(label).querySelector('.cn-table-header__filter')
			return {
				activeColor: getComputedStyle(button('Status')).color,
				idleColor: getComputedStyle(button('Case')).color,
				activeDot: !!button('Status').querySelector('.cn-table-header__filter-dot'),
				idleDot: !!button('Case').querySelector('.cn-table-header__filter-dot'),
			}
		})
		expect(filters.activeColor).not.toBe(filters.idleColor)
		expect(filters.activeDot).toBe(true)
		expect(filters.idleDot).toBe(false)
	})

	test('the sort and filter controls are buttons with names, reached with Tab', async ({ page }) => {
		await openHarness(page)
		await expect(header(page, 'Case').getByRole('button', { name: 'Case', exact: true })).toBeVisible()
		await expect(header(page, 'Case').getByRole('button', { name: 'Filter by Case' })).toBeVisible()
		await expect(header(page, 'Status').getByRole('button', { name: 'Filter by Status, active' })).toBeVisible()

		await header(page, 'Case').getByRole('button', { name: 'Case', exact: true }).focus()
		await page.keyboard.press('Tab')
		const focused = await page.evaluate(() => document.activeElement.getAttribute('aria-label'))
		expect(focused).toBe('Filter by Case')
	})

	test('the filter button opens the column filter panel', async ({ page }) => {
		await openHarness(page)
		await header(page, 'Status').getByRole('button', { name: /Filter by Status/ }).click()
		await expect(page.locator('[data-testid="cn-column-filter"]')).toBeVisible()
	})
})
