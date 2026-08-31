/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A `variant` on a stat/delta tile paints FOREGROUND, so it must use the
 * `-text` tokens.
 *
 * Nextcloud's `--color-success` / `--color-warning` / `--color-error` are FILL
 * colours, meant to sit behind something. DefaultTheme ships
 * `--color-success-text` and friends for foreground use. Painting a number with
 * a fill token failed WCAG AA — axe measured #d8f3da on #f5f5f5, a contrast of
 * 1.08 against the required 3:1, serious, on filinq's dashboard (gate-33).
 *
 * `kpi-card.css` fixed that for the CSS-class path used by CnStatsBlock. This
 * inline map was missed because nothing reached it: every `variant` in the
 * fleet sits on a stats-block. The first manifest to put `variant` on a `stat`
 * or `delta` would have been the first to hit the old failure — which is
 * exactly what converting the fleet's hardcoded `valueColor` overrides to
 * `variant` was about to do.
 */

import { mount } from '@vue/test-utils'
import CnStatWidget from '@/components/CnStatWidget/CnStatWidget.vue'

const mountStat = async (content = {}) => {
	const w = mount(CnStatWidget, {
		propsData: { content: { label: 'Cases', icon: 'Cash', ...content } },
		stubs: { NcLoadingIcon: { template: '<div />' }, CnWidgetIcon: { template: '<div />' } },
	})
	await w.vm.$nextTick()
	return w
}

describe('CnStatWidget — variant colours are foreground-safe', () => {
	// `valueStyle` is asserted rather than the rendered span: with no data
	// source the tile is in its loading/error state and renders no value
	// element, so reading the DOM here would assert on an empty string and pass
	// for the wrong reason.
	it.each(['success', 'warning', 'error'])('paints %s from the -text token', async (variant) => {
		const colour = (await mountStat({ variant })).vm.valueStyle.color

		expect(colour).toContain(`--color-${variant}-text`)
		// The plain fill token may only appear as the fallback inside the
		// var(), never as the value itself.
		expect(colour).not.toMatch(new RegExp(`^var\\(--color-${variant}\\)$`))
	})

	it('keeps the plain token as a fallback for older themes', async () => {
		const colour = (await mountStat({ variant: 'success' })).vm.valueStyle.color

		// A theme predating the -text tokens must degrade to the old colour
		// rather than to none.
		expect(colour).toContain('var(--color-success)')
	})

	it('maps danger onto the error token', async () => {
		expect((await mountStat({ variant: 'danger' })).vm.valueStyle.color).toContain('--color-error-text')
	})

	it('leaves the value uncoloured for the default variant, so the card accent wins', async () => {
		const colour = (await mountStat({ variant: 'default' })).vm.valueStyle.color

		expect(colour || '').not.toContain('--color-')
	})

	it('the icon circle takes the same colour, so tint and number cannot disagree', async () => {
		const w = await mountStat({ variant: 'error' })

		expect(w.vm.iconCircleStyle.color).toContain('--color-error-text')
		expect(w.vm.iconCircleStyle.color).toBe(w.vm.valueStyle.color)
	})
})
