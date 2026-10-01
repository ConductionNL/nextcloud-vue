/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A `variant` on a stat tile paints the number, so it must use the
 * text-on-background tokens (`--color-text-success`, ...), with the pre-32
 * `-text` tokens as fallback. The plain tokens are background tints and their
 * `-text` pairs are near-white in dark mode.
 */

import { mount } from '@vue/test-utils'
import CnStatWidget from '@/components/CnStatWidget/CnStatWidget.vue'

async function mountStat(content = {}) {
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
	it.each([
		['success', 'var(--color-text-success, var(--color-success-text))'],
		['warning', 'var(--color-element-warning, var(--color-warning-text))'],
		['error', 'var(--color-text-error, var(--color-error-text))'],
		['danger', 'var(--color-text-error, var(--color-error-text))'],
	])('paints %s with the readable token and a pre-32 fallback', async (variant, expected) => {
		expect((await mountStat({ variant })).vm.valueStyle.color).toBe(expected)
	})

	it('leaves the value uncoloured for the default variant, so the card accent wins', async () => {
		const colour = (await mountStat({ variant: 'default' })).vm.valueStyle.color

		expect(colour || '').not.toContain('--color-')
	})

	it('the icon circle takes the same colour, so tint and number cannot disagree', async () => {
		const w = await mountStat({ variant: 'error' })

		expect(w.vm.iconCircleStyle.color).toContain('--color-text-error')
		expect(w.vm.iconCircleStyle.color).toBe(w.vm.valueStyle.color)
	})
})
