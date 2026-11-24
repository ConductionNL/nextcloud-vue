/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnAiMessageList lists the sources under an answer in citation order: a file
 * source is a link with its name and page, any other source its name only.
 */
jest.mock('@nextcloud/router', () => ({
	generateUrl: (path, params = {}) => {
		let out = path
		for (const [key, value] of Object.entries(params)) {
			out = out.replace(`{${key}}`, encodeURIComponent(value))
		}
		return `/index.php${out}`
	},
}))

import { mount } from '@vue/test-utils'
const CnAiMessageList = require('../../src/components/CnAiCompanion/CnAiMessageList.vue').default

function mountList(messages) {
	return mount(CnAiMessageList, {
		propsData: { messages },
		provide: { cnTranslate: (key) => key },
	})
}

describe('CnAiMessageList sources', () => {
	it('lists each source in citation order, a file as a link with its page', () => {
		const w = mountList([{
			role: 'assistant',
			content: 'Delivery is in May [1], for Acme [2].',
			sources: [
				{ type: 'file', name: 'offerte.pdf', file_id: 7, page: 3 },
				{ type: 'object', name: 'Client Acme' },
			],
		}])
		const items = w.findAll('[data-testid="cn-ai-message-sources"] .cn-ai-message-list__source')
		expect(items.length).toBe(2)
		expect(items.at(0).find('.cn-ai-message-list__source-number').text()).toBe('[1]')
		const link = items.at(0).find('a.cn-ai-message-list__source-name')
		expect(link.attributes('href')).toBe('/index.php/f/7')
		expect(link.attributes('target')).toBe('_blank')
		expect(link.text()).toBe('offerte.pdf')
		expect(items.at(0).find('.cn-ai-message-list__source-page').text()).toBe('page 3')
		expect(items.at(1).find('.cn-ai-message-list__source-number').text()).toBe('[2]')
		expect(items.at(1).find('a').exists()).toBe(false)
		expect(items.at(1).find('.cn-ai-message-list__source-name').text()).toBe('Client Acme')
	})

	it('shows no source list for an answer without sources', () => {
		const w = mountList([{ role: 'assistant', content: 'Hello' }, { role: 'user', content: 'Hi', sources: [{ type: 'file', id: 1 }] }])
		expect(w.find('[data-testid="cn-ai-message-sources"]').exists()).toBe(false)
	})
})
