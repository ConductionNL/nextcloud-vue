/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Author HTML in the text widget is sanitised with the widget's own config:
 * `target` stays and gains `rel`, `data-*` attributes go, and the app's
 * translate function (which sanitises with its own allow-list) never sees it.
 * Overflowing text can be scrolled back to its first line.
 */
import { mount } from '@vue/test-utils'
import DOMPurify from 'dompurify'
import CnTextWidget from '@/components/CnTextWidget/CnTextWidget.vue'

// Like `t()` from @nextcloud/l10n: no translation, but a default DOMPurify pass.
const sanitizingTranslate = jest.fn((text) => (text === 'Welcome' ? 'Welkom' : DOMPurify.sanitize(text)))

function mountWidget(content) {
	return mount(CnTextWidget, {
		propsData: { content },
		provide: { cnTranslate: sanitizingTranslate },
		stubs: { ChevronRight: true },
	})
}

describe('CnTextWidget author content', () => {
	beforeEach(() => sanitizingTranslate.mockClear())

	it.each(['markdown', 'html'])('keeps target="_blank" and adds rel in %s mode', (contentMode) => {
		const link = mountWidget({ text: '<a href="https://example.com" target="_blank">x</a>', contentMode }).find('.cn-text-widget__content a')
		expect(link.attributes('target')).toBe('_blank')
		expect(link.attributes('rel')).toBe('noopener noreferrer')
		expect(sanitizingTranslate).not.toHaveBeenCalled()
	})

	it.each(['markdown', 'html'])('strips data-* attributes and keeps the href in %s mode', (contentMode) => {
		const link = mountWidget({ text: "<a href='http://example.com' data-malicious='xss'>link</a>", contentMode }).find('.cn-text-widget__content a')
		expect(link.attributes('href')).toBe('http://example.com')
		expect(link.attributes('data-malicious')).toBeUndefined()
	})

	it('strips data-* attributes in a table cell', () => {
		const content = {
			tableMode: true,
			tableData: { rows: [[{ text: '<span data-x="1">A</span>', rowSpan: 1, colSpan: 1 }]] },
		}
		const cell = mountWidget(content).find('.cn-text-widget__table td span')
		expect(cell.text()).toBe('A')
		expect(cell.attributes('data-x')).toBeUndefined()
	})

	it('still translates plain text', () => {
		expect(mountWidget({ text: 'Welcome' }).find('.cn-text-widget__content').text()).toBe('Welkom')
	})

	it('centres safely, so the top of overflowing text stays reachable', () => {
		const style = mountWidget({ text: 'Short' }).vm.wrapperStyle
		expect(style['align-items']).toBe('safe center')
		expect(style['justify-content']).toBe('safe center')
	})
})
