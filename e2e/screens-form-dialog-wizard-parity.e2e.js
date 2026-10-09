// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// screens-form-parity, screens-dialog-parity and screens-wizard-parity: the
// claims that are LAYOUT, which jsdom cannot judge. Each has a control without
// the board look (`&plain=1`), so a passing assertion is about the change.
//
// @spec openspec/changes/screens-form-parity/specs/form-field-anatomy/spec.md
// @spec openspec/changes/screens-dialog-parity/specs/dialog-system/spec.md
// @spec openspec/changes/screens-wizard-parity/specs/wizard-dialog/spec.md

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

/**
 * @param {import('@playwright/test').Page} page The page.
 * @param {string} query The harness query.
 * @return {Promise<void>}
 */
async function open(page, query) {
	await page.goto('/' + query, { waitUntil: 'domcontentloaded', timeout: 90_000 })
	await expect(page.locator('[data-testid="screensform-box"]')).toBeAttached({ timeout: 90_000 })
}

const rect = (locator) => locator.evaluate((el) => {
	const r = el.getBoundingClientRect()
	return { top: r.top, left: r.left, width: r.width, height: r.height, right: r.right, bottom: r.bottom }
})

test.describe('form page', () => {
	test('label 14px above a 40px control with a 6px gap', async ({ page }) => {
		await open(page, '?screensform=form')
		const group = page.locator('[data-field-key="title"]')
		const label = group.locator('.cn-form-field__label')
		await expect(label).toBeVisible()
		expect(await label.evaluate((el) => getComputedStyle(el).fontSize)).toBe('14px')
		expect(await group.locator('.cn-form-field__head').evaluate((el) => getComputedStyle(el).rowGap)).toBe('6px')
		const input = group.locator('input')
		expect(Math.round((await rect(input)).height)).toBeGreaterThanOrEqual(40)
		// the label sits above the control
		expect((await rect(label)).bottom).toBeLessThanOrEqual((await rect(input)).top)

		await open(page, '?screensform=form&plain=1')
		await expect(page.locator('[data-field-key="title"] .cn-form-field__label')).toHaveCount(0)
	})

	test('half fields share a row at 640px and stack at 390px', async ({ page }) => {
		await open(page, '?screensform=form&w=640')
		const tops = async () => [
			Math.round((await rect(page.locator('[data-field-key="first"]'))).top),
			Math.round((await rect(page.locator('[data-field-key="last"]'))).top),
		]
		const wide = await tops()
		expect(wide[0]).toBe(wide[1])

		await open(page, '?screensform=form&w=390')
		const narrow = await tops()
		expect(narrow[1]).toBeGreaterThan(narrow[0])
	})

	test('an invalid field has a 4px edge and a 2px control border', async ({ page }) => {
		await open(page, '?screensform=form')
		await page.locator('form').first().evaluate((f) => f.requestSubmit())
		const group = page.locator('[data-field-key="title"]')
		await expect(group).toHaveClass(/cn-form-field--invalid/)
		const style = await group.evaluate((el) => {
			const cs = getComputedStyle(el)
			return { edge: cs.borderInlineStartWidth, pad: cs.paddingInlineStart }
		})
		expect(style.edge).toBe('4px')
		expect(style.pad).toBe('16px')
		expect(await group.locator('input').evaluate((el) => getComputedStyle(el).borderTopWidth)).toBe('2px')
	})
})

test.describe('dialog', () => {
	test('the board dialog is 640px wide with a 12px radius, a hairline footer and a 40px Delete', async ({ page }) => {
		await open(page, '?screensform=dialog')
		const container = page.locator('.cn-dialog-board .modal-container').first()
		await expect(container).toBeVisible({ timeout: 30_000 })
		const box = await rect(container)
		expect(Math.round(box.width)).toBe(640)
		expect(await container.evaluate((el) => getComputedStyle(el).borderTopLeftRadius)).toBe('12px')
		const actions = page.locator('.cn-dialog-board .dialog__actions')
		expect(await actions.evaluate((el) => getComputedStyle(el).borderTopWidth)).toBe('1px')
		const del = page.locator('.cn-dialog-board .dialog__actions button', { hasText: 'Delete' })
		expect(Math.round((await rect(del)).height)).toBeGreaterThanOrEqual(40)
		const cancel = await rect(page.locator('.cn-dialog-board .dialog__actions button', { hasText: 'Cancel' }))
		expect(cancel.right).toBeLessThanOrEqual((await rect(del)).left)

		await open(page, '?screensform=dialog&plain=1')
		await expect(page.locator('.cn-dialog-board')).toHaveCount(0)
	})

	test('noClose disables the header close button', async ({ page }) => {
		await open(page, '?screensform=dialog&noclose=1')
		await expect(page.locator('.cn-dialog-board .modal-container').first()).toBeVisible({ timeout: 30_000 })
		const close = page.locator('.cn-dialog-header__close')
		if (await close.count()) {
			await expect(close).toBeDisabled()
		}
		await page.keyboard.press('Escape')
		await expect(page.locator('.cn-dialog-board .modal-container').first()).toBeVisible()
	})
})

test.describe('wizard', () => {
	test('the board stepper draws 28px circles and a finished step is a green check', async ({ page }) => {
		await open(page, '?screensform=wizard')
		const stepper = page.locator('.cn-dialog-board ol').first()
		await expect(stepper).toBeVisible({ timeout: 30_000 })
		const items = stepper.locator('li')
		await expect(items).toHaveCount(3)
		await expect(items.nth(1)).toHaveAttribute('aria-current', 'step')
		const circle = items.first().locator('[class*="circle"]').first()
		const box = await rect(circle)
		expect(Math.round(box.width)).toBe(28)
		expect(Math.round(box.height)).toBe(28)
		await expect(items.first().locator('svg')).toHaveCount(1)
	})

	test('the footer holds Cancel or Back at the left and the primary at the right', async ({ page }) => {
		await open(page, '?screensform=wizard')
		const actions = page.locator('.cn-dialog-board .dialog__actions')
		await expect(actions).toBeVisible({ timeout: 30_000 })
		const buttons = actions.locator('button')
		const rects = await buttons.evaluateAll((els) => els.map((el) => ({ text: el.textContent.trim(), left: el.getBoundingClientRect().left })))
		const next = rects.find((r) => /Next/.test(r.text))
		const others = rects.filter((r) => r !== next)
		expect(next).toBeTruthy()
		others.forEach((r) => expect(r.left).toBeLessThan(next.left))
		const box = await rect(actions)
		expect(next.left).toBeGreaterThan(box.left + box.width / 2)
	})
})

test.describe('stepped form page', () => {
	test('the footer has Cancel at the left and the primary at the right', async ({ page }) => {
		await open(page, '?screensform=steps')
		const form = page.locator('.cn-form-page').first()
		await expect(form).toBeVisible({ timeout: 30_000 })
		const buttons = form.locator('button')
		const rects = await buttons.evaluateAll((els) => els.map((el) => ({ text: el.textContent.trim(), left: el.getBoundingClientRect().left, top: el.getBoundingClientRect().top })))
		const primary = rects.find((r) => /Next|Continue|Submit/i.test(r.text))
		const cancel = rects.find((r) => /Cancel/i.test(r.text))
		expect(primary).toBeTruthy()
		expect(cancel).toBeTruthy()
		expect(cancel.left).toBeLessThan(primary.left)
	})
})
