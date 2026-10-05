/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * CnBrandStripe: three decorative bands that read the library's own
 * `--cn-brand-stripe-*` custom properties.
 *
 * jsdom loads no stylesheet, so the token contract is asserted on the SOURCE
 * of the component: a rendered-DOM assertion could not tell a stripe that
 * reads the tokens from one that hard-codes a colour.
 *
 * @spec openspec/changes/workplace-dashboard-primitives/specs/workplace-dashboard-primitives/spec.md#requirement-brand-stripe
 * @spec openspec/changes/brand-motif-token/specs/brand-motif-token/spec.md
 */

import { mount } from '@vue/test-utils'
import fs from 'fs'
import path from 'path'
import CnBrandStripe from '../../src/components/CnBrandStripe/CnBrandStripe.vue'
import { CnBrandStripe as PublicBrandStripe } from '../../src/public/index.js'

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
		expect(STYLE).toContain(`var(--cn-brand-stripe-color-${n}, var(--color-primary-element))`)
		expect(STYLE).toContain(`var(--cn-brand-stripe-ratio-${n}, 1)`)
	})

	it('reads the height token with a fallback', () => {
		expect(STYLE).toContain('var(--cn-brand-stripe-height, 4px)')
	})

	it('draws the theme motif instead of the bands when one is named, the bands otherwise', () => {
		expect(STYLE).toMatch(/background-image:\s*var\(--cn-brand-stripe-image,\s*var\(--cn-brand-stripe-bands\)\)/)
		// The bands are the root's own gradient, so the image can replace them.
		expect(STYLE).toMatch(/--cn-brand-stripe-bands:\s*linear-gradient\(/)
		expect(STYLE).not.toMatch(/\.cn-brand-stripe__band--\d\s*{[^}]*background/)
	})

	it('draws the inverse motif on a dark band, else the one image, else the bands', () => {
		const wrapper = mount(CnBrandStripe, { propsData: { variant: 'inverse' } })
		expect(wrapper.classes()).toContain('cn-brand-stripe--inverse')
		expect(mount(CnBrandStripe).classes()).not.toContain('cn-brand-stripe--inverse')
		expect(STYLE).toMatch(/\.cn-brand-stripe--inverse\s*{\s*background-image:\s*var\(--cn-brand-stripe-image-inverse,\s*var\(--cn-brand-stripe-image,\s*var\(--cn-brand-stripe-bands\)\)\)/)
	})

	it('accepts only the two variants', () => {
		const { validator } = CnBrandStripe.props.variant
		expect(validator('default')).toBe(true)
		expect(validator('inverse')).toBe(true)
		expect(validator('dark')).toBe(false)
	})

	it('is exported from the public-safe entry, for a portal renderer', () => {
		expect(PublicBrandStripe).toBe(CnBrandStripe)
	})

	it('reads no theme token: a theming app maps its tokens onto ours', () => {
		expect(SOURCE).not.toContain('--nldesign-')
	})

	it('hard-codes no colour', () => {
		expect(STYLE).not.toMatch(/#[0-9a-f]{3,8}\b/i)
		expect(STYLE).not.toMatch(/\brgba?\(/)
	})
})
