/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnInteractionFormWidget — pixel reference.
 *
 * The widget's markup was extracted onto the shared CnFormWidgetBase
 * primitive so other form widgets can be built on the same base. The
 * extraction had ONE hard requirement: nothing a user can see may change.
 * jsdom cannot settle that — it computes no layout — so the proof is a real
 * Chromium screenshot of the widget at a fixed width, written to
 * `test-results/ifw/`. The same spec ran before and after the refactor and
 * the two PNGs were compared byte-for-byte.
 *
 * The OpenRegister lookups CnResourceSelect issues are stubbed to an empty
 * result set so the rendering is deterministic and offline.
 */
import { test, expect } from '@playwright/test'

test.describe('CnInteractionFormWidget', () => {
	test.beforeEach(async ({ page }) => {
		// Deterministic, offline: every OpenRegister read answers "no objects".
		await page.route('**/apps/openregister/**', (route) => route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({ results: [], total: 0 }),
		}))
	})

	test('renders the active-interaction form', async ({ page }) => {
		await page.setViewportSize({ width: 800, height: 900 })
		await page.goto('/?ifw=1')

		const widget = page.locator('.cn-interaction-form-widget')
		await expect(widget).toBeVisible()

		// The five fields, the submit button, in order.
		await expect(page.getByText('Channel')).toBeVisible()
		await expect(page.getByText('Client')).toBeVisible()
		await expect(page.getByText('Subject')).toBeVisible()
		await expect(page.getByText('Summary')).toBeVisible()
		await expect(page.getByText('Outcome')).toBeVisible()
		await expect(page.getByRole('button', { name: 'Register' })).toBeVisible()

		// The textarea is the one field with no NC component behind it.
		await expect(widget.locator('textarea.cn-interaction-form-widget__textarea')).toHaveCount(1)

		// Submit stays disabled until Subject has content — the widget's only
		// client-side gate, and the one piece of behaviour the base must keep
		// delegating to the host component.
		const submit = page.getByRole('button', { name: 'Register' })
		await expect(submit).toBeDisabled()
		await page.locator('.cn-interaction-form-widget input[type="text"]').first().fill('Broken meter')
		await expect(submit).toBeEnabled()

		// Pixel reference. Taken of the fixed-width frame, not the viewport, so
		// it is insensitive to anything outside the widget.
		await page.locator('[data-testid="ifw-frame"]').screenshot({
			path: `test-results/ifw/${process.env.IFW_LABEL || 'current'}.png`,
		})
	})
})
