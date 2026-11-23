/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The text widget runs manifest text through the app's translate function and
 * can draw a link under it (board PqWachtrij, the "Afspraken" card).
 */
const { mount } = require('@vue/test-utils')
const CnTextWidget = require('../../src/components/CnTextWidget/CnTextWidget.vue').default

const DUTCH = { 'Appointments today': 'Afspraken vandaag', 'All appointments': 'Alle afspraken' }
const translate = (key) => DUTCH[key] || key

function mountWidget(content, router = null) {
	return mount(CnTextWidget, {
		propsData: { content },
		provide: { cnTranslate: translate },
		mocks: router ? { $router: router } : {},
		stubs: { ChevronRight: true },
	})
}

const router = {
	resolve: (location) => ({ href: `/apps/pipelinq/${location.name || location.path}` }),
	push: jest.fn(() => Promise.resolve()),
}

describe('CnTextWidget translation and link', () => {
	it('translates the text', () => {
		expect(mountWidget({ text: 'Appointments today' }).find('.cn-text-widget__content').text()).toBe('Afspraken vandaag')
	})

	it('draws a translated link to a page and routes a plain click', async () => {
		router.push.mockClear()
		const wrapper = mountWidget({ text: 'Appointments today', link: { label: 'All appointments', route: 'SlaAttainment' } }, router)
		const link = wrapper.find('[data-testid="cn-text-widget-link"]')
		expect(link.text()).toBe('Alle afspraken')
		expect(link.attributes('href')).toBe('/apps/pipelinq/SlaAttainment')
		expect(link.attributes('target')).toBeUndefined()
		await link.trigger('click', { button: 0 })
		expect(router.push).toHaveBeenCalledWith({ name: 'SlaAttainment' })
	})

	it('opens an external link in a new tab', () => {
		const link = mountWidget({ text: 'x', link: { label: 'Docs', href: 'https://example.org' } }).find('[data-testid="cn-text-widget-link"]')
		expect(link.attributes('href')).toBe('https://example.org')
		expect(link.attributes('target')).toBe('_blank')
		expect(link.attributes('rel')).toBe('noopener noreferrer')
	})

	it('draws no link without a label or a target', () => {
		expect(mountWidget({ text: 'x', link: { route: 'A' } }, router).find('[data-testid="cn-text-widget-link"]').exists()).toBe(false)
		expect(mountWidget({ text: 'x', link: { label: 'A' } }, router).find('[data-testid="cn-text-widget-link"]').exists()).toBe(false)
	})
})
