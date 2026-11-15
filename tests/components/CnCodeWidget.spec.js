/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A detail page can show a record as a code (`code` widget): QR, Code 128 or
 * EAN-13, drawn in the browser (buildiq pages-qr-and-barcodes D3).
 *
 * @spec openspec/changes/code-widget/specs/code-widget/spec.md
 */
import { mount } from '@vue/test-utils'
import { TextEncoder } from 'node:util'
import CnCodeWidget from '../../src/components/CnCodeWidget/CnCodeWidget.vue'
import { getWidgetTypeEntry } from '../../src/components/CnWidgetGrid/dashboardWidgetRegistry.js'
import { CODE128_WIDTHS, code128Values, eanCheckDigit, encodeCode128, encodeEan13 } from '../../src/utils/barcode1d.js'

import '../../src/components/CnCodeWidget/index.js'

globalThis.TextEncoder ??= TextEncoder

describe('barcode1d', () => {
	it('has 107 distinct Code 128 symbols of 11 modules, the stop of 13, each three bars and three spaces', () => {
		expect(CODE128_WIDTHS).toHaveLength(107)
		expect(new Set(CODE128_WIDTHS).size).toBe(107)
		CODE128_WIDTHS.slice(0, 106).forEach((w) => {
			expect(w).toHaveLength(6)
			expect([...w].reduce((a, d) => a + Number(d), 0)).toBe(11)
			// Bars (odd positions) add up to an even width in every Code 128 symbol.
			expect((Number(w[0]) + Number(w[2]) + Number(w[4])) % 2).toBe(0)
		})
		expect([...CODE128_WIDTHS[106]].reduce((a, d) => a + Number(d), 0)).toBe(13)
	})

	it('encodes code set B with its check symbol', () => {
		// "PJJ123C": start B 104, data 48 42 42 17 18 19 35, check (104 + 48 + 84 + 126 + 68 + 90 + 114 + 245) % 103 = 55.
		expect(code128Values('PJJ123C')).toEqual([104, 48, 42, 42, 17, 18, 19, 35, 55, 106])
		const modules = encodeCode128('PJJ123C')
		expect(modules.length).toBe(11 * 9 + 13)
		expect(modules.startsWith('11010010000')).toBe(true)
		expect(modules.endsWith('1100011101011')).toBe(true)
		expect(encodeCode128('é')).toBeNull()
		expect(encodeCode128('')).toBeNull()
	})

	it('encodes EAN-13 with its guards and refuses a wrong check digit', () => {
		expect(eanCheckDigit('400638133393')).toBe(1)
		const ean = encodeEan13('400638133393')
		expect(ean.digits).toBe('4006381333931')
		expect(ean.modules).toHaveLength(95)
		expect(ean.modules.slice(0, 3)).toBe('101')
		expect(ean.modules.slice(45, 50)).toBe('01010')
		// First digit 4 → LGLLGG: the second digit (0) in L is 0001101.
		expect(ean.modules.slice(3, 10)).toBe('0001101')
		expect(encodeEan13('4006381333932')).toBeNull()
		expect(encodeEan13('12AB')).toBeNull()
	})
})

describe('CnCodeWidget', () => {
	it('is the code widget type', () => {
		expect(getWidgetTypeEntry('code').renderer).toBe(CnCodeWidget)
	})

	it('draws a Code 128 of a field with its value under it', () => {
		const w = mount(CnCodeWidget, { props: { content: { format: 'code128', source: 'field', field: 'serial' }, objectData: { serial: 'SN-0042' } } })
		expect(w.find('[data-testid="cn-code-widget-bars"]').exists()).toBe(true)
		expect(w.text()).toContain('SN-0042')
		expect(w.find('[data-testid="cn-code-widget-download"]').exists()).toBe(true)
	})

	it('draws a QR of the record address from the url tokens', () => {
		const w = mount(CnCodeWidget, { props: { content: { format: 'qr', source: 'address', url: '/apps/buildiq/builder/assets/devices/@objectId' }, objectId: 'd1' } })
		expect(w.vm.value).toBe(`${window.location.origin}/apps/buildiq/builder/assets/devices/d1`)
		expect(w.find('[data-testid="cn-qr-code"]').exists()).toBe(true)
	})

	it('says why it cannot draw', () => {
		const noValue = mount(CnCodeWidget, { props: { content: { format: 'qr', source: 'field', field: 'serial' }, objectData: {} } })
		expect(noValue.find('[data-testid="cn-code-widget-problem"]').exists()).toBe(true)
		const badEan = mount(CnCodeWidget, { props: { content: { format: 'ean13', source: 'field', field: 'ean' }, objectData: { ean: '123' } } })
		expect(badEan.find('[data-testid="cn-code-widget-problem"]').text()).toContain('EAN-13')
		const addressBar = mount(CnCodeWidget, { props: { content: { format: 'code128', source: 'address' } } })
		expect(addressBar.find('[data-testid="cn-code-widget-problem"]').text()).toContain('field')
	})
})
