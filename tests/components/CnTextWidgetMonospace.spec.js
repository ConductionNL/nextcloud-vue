/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/text-widget-monospace/tasks.md#task-1
 * @spec openspec/changes/text-widget-monospace/tasks.md#task-2
 */
import { mount } from '@vue/test-utils'
import CnTextWidget from '@/components/CnTextWidget/CnTextWidget.vue'

const RECEIPT = 'Pen        2 x 1,00\n<b>Total</b>      2,00'

describe('CnTextWidget monospace', () => {
	it('shows the text as typed, with its spaces and markup kept as text', () => {
		const w = mount(CnTextWidget, { propsData: { content: { text: RECEIPT, monospace: true } } })
		const pre = w.find('[data-testid="cn-text-widget-mono"]')
		expect(pre.element.tagName).toBe('PRE')
		expect(pre.element.textContent).toBe(RECEIPT)
		expect(pre.find('b').exists()).toBe(false)
		expect(w.find('.cn-text-widget__content').exists()).toBe(false)
	})

	it('ignores markdown mode when monospace is on', () => {
		const w = mount(CnTextWidget, { propsData: { content: { text: '**not bold**', contentMode: 'markdown', monospace: true } } })
		expect(w.find('[data-testid="cn-text-widget-mono"]').text()).toBe('**not bold**')
		expect(w.find('strong').exists()).toBe(false)
	})

	it('keeps the parsed branch without monospace', () => {
		const w = mount(CnTextWidget, { propsData: { content: { text: '<b>x</b>' } } })
		expect(w.find('[data-testid="cn-text-widget-mono"]').exists()).toBe(false)
		expect(w.find('.cn-text-widget__content b').exists()).toBe(true)
	})

	it('shows the placeholder when the monospace text is empty', () => {
		const w = mount(CnTextWidget, { propsData: { content: { text: '  ', monospace: true } } })
		expect(w.find('[data-testid="cn-text-widget-mono"]').exists()).toBe(false)
		expect(w.find('.cn-text-widget__placeholder').exists()).toBe(true)
	})
})

describe('CnTextWidget textField', () => {
	it('reads the text from the named field of the detail object', () => {
		const w = mount(CnTextWidget, { propsData: { content: { textField: 'receiptText', text: 'fallback', monospace: true }, objectData: { receiptText: RECEIPT } } })
		expect(w.find('[data-testid="cn-text-widget-mono"]').element.textContent).toBe(RECEIPT)
	})

	it('shows the placeholder when the field is empty on the object', () => {
		const w = mount(CnTextWidget, { propsData: { content: { textField: 'receiptText', monospace: true }, objectData: {} } })
		expect(w.find('.cn-text-widget__placeholder').exists()).toBe(true)
	})
})
