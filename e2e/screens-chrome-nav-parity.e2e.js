// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// screens-chrome-parity (tasks 4 and 5): the navigation measured against the
// board AppZijbalk (design-system preview/screens/boards/AppZijbalk.html), whose
// inline styles are the numbers below: a 264px column with a 1px end border and
// padding 20px 14px, a 42px primary button with radius 8, 42px entries at 15px
// (500, the open one 600 on the tonal primary), 12px uppercase captions at 600,
// 22px count pills (radius 11, 12px at 700, red when they ask for attention),
// and the footer Help then Advanced at 40px, pushed to the bottom.
// ScreensNavHarness.vue (?screensnav=1), with a control without the look.
//
// @spec openspec/changes/screens-chrome-parity/specs/layout-components/spec.md#requirement-the-navigation-takes-the-board-anatomy
// @spec openspec/changes/screens-chrome-parity/specs/layout-components/spec.md#requirement-a-navigation-count-can-ask-for-attention
// @spec openspec/changes/screens-chrome-parity/specs/layout-components/spec.md#requirement-the-navigation-footer-reads-help-then-advanced

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 180_000 })

/**
 * @param {import('@playwright/test').Page} page The page.
 * @param {string} query The harness query.
 * @return {Promise<void>}
 */
async function open(page, query) {
	await page.setViewportSize({ width: 1440, height: 1000 })
	await page.goto('/' + query, { waitUntil: 'domcontentloaded', timeout: 120_000 })
	await expect(page.locator('[data-testid="screensnav-box"] [data-testid="cn-nav-entry-dashboard"]')).toBeVisible({ timeout: 120_000 })
}

/**
 * @param {import('@playwright/test').Locator} locator The element.
 * @param {string[]} props The computed style properties to read.
 * @return {Promise<object>} The box and the properties.
 */
function measure(locator, props = []) {
	return locator.evaluate((el, names) => {
		const r = el.getBoundingClientRect()
		const cs = getComputedStyle(el)
		const out = { top: r.top, left: r.left, width: r.width, height: r.height, right: r.right, bottom: r.bottom }
		names.forEach((name) => {
			out[name] = cs[name]
		})
		return out
	}, props)
}

const link = (page, id) => page.locator(`[data-testid="cn-nav-entry-${id}"] .app-navigation-entry-link`).first()

test.describe('the navigation against board AppZijbalk', () => {
	test('the column: 264px, a 1px end border, padding 20px 14px', async ({ page }) => {
		await open(page, '?screensnav=1')
		const nav = await measure(page.locator('[data-testid="cn-nav"]'), ['borderInlineEndWidth'])
		expect(Math.round(nav.width)).toBe(264)
		expect(nav.borderInlineEndWidth).toBe('1px')
		const content = await measure(page.locator('[data-testid="cn-nav"] .app-navigation__content').first(), ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'])
		expect([content.paddingTop, content.paddingRight, content.paddingBottom, content.paddingLeft]).toEqual(['20px', '14px', '20px', '14px'])
	})

	test('the primary action: 42px high, radius 8, 15px at 600, the width of the column', async ({ page }) => {
		await open(page, '?screensnav=1')
		const button = await measure(page.locator('[data-testid="cn-nav"] .app-navigation-new .button-vue').first(), ['borderTopLeftRadius', 'fontSize', 'fontWeight'])
		expect(Math.round(button.height)).toBe(42)
		expect(button.borderTopLeftRadius).toBe('8px')
		expect(button.fontSize).toBe('15px')
		expect(button.fontWeight).toBe('600')
		// 264 - 2 x 14 padding - 1px border.
		expect(Math.abs(button.width - 235)).toBeLessThanOrEqual(1)
	})

	test('the entries: 42px, radius 8, padding 0 10px, 15px at 500; the open one 600 on the tonal primary', async ({ page }) => {
		await open(page, '?screensnav=1')
		const plain = await measure(link(page, 'requests'), ['borderTopLeftRadius', 'fontSize', 'fontWeight', 'paddingLeft', 'backgroundColor'])
		expect(Math.round(plain.height)).toBe(42)
		expect(plain.borderTopLeftRadius).toBe('8px')
		expect(plain.paddingLeft).toBe('10px')
		expect(plain.fontSize).toBe('15px')
		expect(plain.fontWeight).toBe('500')
		const active = await measure(link(page, 'dashboard'), ['fontWeight', 'backgroundColor'])
		expect(active.fontWeight).toBe('600')
		expect(active.backgroundColor).not.toBe(plain.backgroundColor)
		const tonal = await page.evaluate(() => {
			const probe = document.createElement('div')
			probe.style.background = 'var(--color-primary-element-light)'
			document.body.appendChild(probe)
			const value = getComputedStyle(probe).backgroundColor
			probe.remove()
			return value
		})
		expect(active.backgroundColor).toBe(tonal)
	})

	test('the captions: 12px uppercase at 600 with 0.06em tracking, in the board order', async ({ page }) => {
		await open(page, '?screensnav=1')
		const caption = page.locator('[data-testid="cn-nav-caption-cap-contact"]').first()
		const heading = caption.locator('.app-navigation-caption__name').first()
		const style = await measure(heading, ['fontSize', 'fontWeight', 'textTransform', 'letterSpacing'])
		expect(style.fontSize).toBe('12px')
		expect(style.fontWeight).toBe('600')
		expect(style.textTransform).toBe('uppercase')
		expect(parseFloat(style.letterSpacing)).toBeCloseTo(0.72, 1)

		// Section order of the board: the primary action, three entries, then
		// Klantcontact with three, then Relaties with two.
		const order = await page.locator('[data-testid="cn-nav"] .app-navigation__list > li').evaluateAll((els) => els.map((el) => el.getAttribute('data-testid')))
		expect(order).toEqual([
			'cn-nav-entry-dashboard',
			'cn-nav-entry-mine',
			'cn-nav-entry-queue',
			'cn-nav-caption-cap-contact',
			'cn-nav-entry-requests',
			'cn-nav-entry-contacts',
			'cn-nav-entry-appointments',
			'cn-nav-caption-cap-relations',
			'cn-nav-entry-people',
			'cn-nav-entry-orgs',
		])
	})

	test('the vertical rhythm: 20px to the primary action and the list, entries 2px apart, 20px captions 20px after their group', async ({ page }) => {
		await open(page, '?screensnav=1')
		const nav = await measure(page.locator('[data-testid="cn-nav"]'))
		const button = await measure(page.locator('[data-testid="cn-nav"] .app-navigation-new .button-vue').first())
		const entry = async (id) => measure(page.locator(`[data-testid="cn-nav-entry-${id}"] .app-navigation-entry`).first())
		const dashboard = await entry('dashboard')
		const mine = await entry('mine')
		const queue = await entry('queue')
		const requests = await entry('requests')
		const caption = await measure(page.locator('[data-testid="cn-nav-caption-cap-contact"]'))
		expect(Math.round(button.top - nav.top)).toBe(20)
		expect(Math.round(dashboard.top - button.bottom)).toBe(20)
		expect(Math.round(mine.top - dashboard.bottom)).toBe(2)
		expect(Math.round(caption.top - queue.bottom)).toBe(20)
		expect(Math.round(caption.height)).toBe(20)
		expect(Math.round(requests.top - caption.bottom)).toBe(2)
	})

	test('the counts: 22px pills, radius 11, 12px at 700, red when they ask for attention', async ({ page }) => {
		await open(page, '?screensnav=1')
		for (const id of ['mine', 'queue']) {
			const pill = page.locator(`[data-testid="cn-nav-count-${id}"]`)
			await expect(pill).toBeVisible()
			const s = await measure(pill, ['borderTopLeftRadius', 'fontSize', 'fontWeight', 'backgroundColor'])
			expect(Math.round(s.height)).toBe(22)
			expect(Math.round(s.width)).toBeGreaterThanOrEqual(22)
			expect(s.borderTopLeftRadius).toBe('11px')
			expect(s.fontSize).toBe('12px')
			expect(s.fontWeight).toBe('700')
			expect(await pill.evaluate((el) => el.classList.contains('cn-app-nav__count--attention'))).toBe(true)
		}
		expect((await page.locator('[data-testid="cn-nav-count-mine"]').innerText()).trim()).toBe('5')
		expect((await page.locator('[data-testid="cn-nav-count-queue"]').innerText()).trim()).toBe('3')
	})

	test('the footer: Help then Advanced, 40px each, at the bottom of the column', async ({ page }) => {
		await open(page, '?screensnav=1')
		const help = page.locator('[data-testid="cn-nav"]').getByText('Hulp en uitleg', { exact: true }).first()
		const advanced = page.locator('[data-testid="cn-nav"]').getByText('Geavanceerd', { exact: true }).first()
		await expect(help).toBeVisible()
		await expect(advanced).toBeVisible()
		// The rows, not the labels: Help is a footer entry, Advanced the settings foldout's button.
		const h = await measure(page.locator('[data-testid="cn-nav-help"] .app-navigation-entry').first())
		const a = await measure(page.locator('[data-testid="cn-nav-settings"] .button-vue').first())
		await expect(page.locator('[data-testid="cn-nav-help"]')).toContainText('Hulp en uitleg')
		await expect(page.locator('[data-testid="cn-nav-settings"] .button-vue').first()).toContainText('Geavanceerd')
		expect(h.top).toBeLessThan(a.top)
		expect(Math.round(a.top - h.bottom)).toBe(2)
		expect(await page.locator('[data-testid="cn-nav-help"] .app-navigation-entry-link').first().evaluate((el) => getComputedStyle(el).fontWeight)).toBe('400')
		expect(Math.round(h.height)).toBe(40)
		expect(Math.round(a.height)).toBe(40)
		const lastEntry = await measure(page.locator('[data-testid="cn-nav-entry-orgs"]'))
		const nav = await measure(page.locator('[data-testid="cn-nav"]'))
		// Pushed down: the footer ends 20px above the bottom of the column, far below the list.
		expect(nav.bottom - a.bottom).toBeLessThanOrEqual(21)
		expect(h.top - lastEntry.bottom).toBeGreaterThan(40)
	})

	test('without the look the navigation keeps the Nextcloud anatomy (control)', async ({ page }) => {
		await open(page, '?screensnav=1&plain=1')
		const nav = await measure(page.locator('[data-testid="cn-nav"]'))
		expect(Math.round(nav.width)).not.toBe(264)
		await expect(page.locator('.cn-app-nav__count')).toHaveCount(0)
	})
})
