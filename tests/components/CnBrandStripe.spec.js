/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * CnBrandStripe: three decorative bands that read the theme's stripe tokens.
 *
 * jsdom loads no stylesheet, so the token contract is asserted on the SOURCE
 * of the component: a rendered-DOM assertion could not tell a stripe that
 * reads the tokens from one that hard-codes a colour.
 *
 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-brand-stripe
 */

import { mount } from '@vue/test-utils'
import fs from 'fs'
import path from 'path'
import CnBrandStripe from '../../src/components/CnBrandStripe/CnBrandStripe.vue'

const SOURCE = fs.readFileSync(path.resolve(__dirname, '../../src/components/CnBrandStripe/CnBrandStripe.vue'), 'utf8')
const STYLE = SOURCE.slice(SOURCE.indexOf('<style'))

describe('CnBrandStripe', () => {
	it('renders three bands and hides them from assistive technology', () => {
		const wrapper = mount(CnBrandStripe)
		expect(wrapper.attributes('aria-hidden')).toBe('true')
		expect(wrapper.findAll('.cn-brand-stripe__band')).toHaveLength(3)
		expect(wrapper.text()).toBe('')
	})

	it('is horizontal by default and vertical on request', () => {
		expect(mount(CnBrandStripe).classes()).not.toContain('cn-brand-stripe--vertical')
		expect(mount(CnBrandStripe, { propsData: { orientation: 'vertical' } }).classes()).toContain('cn-brand-stripe--vertical')
	})

	it.each([1, 2, 3])('reads colour and ratio token %i, each with a fallback', (n) => {
		expect(STYLE).toContain(`var(--nldesign-brand-stripe-color-${n}, var(--color-primary-element))`)
		expect(STYLE).toContain(`var(--nldesign-brand-stripe-ratio-${n}, 1)`)
	})

	it('reads the height token with a fallback', () => {
		expect(STYLE).toContain('var(--nldesign-brand-stripe-height, 4px)')
	})

	it('hard-codes no colour', () => {
		expect(STYLE).not.toMatch(/#[0-9a-f]{3,8}\b/i)
		expect(STYLE).not.toMatch(/\brgba?\(/)
	})
})
