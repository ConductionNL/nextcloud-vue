/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnAiMessageList shows the files on a question, and the images, files and
 * notices an answer brought back.
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

describe('CnAiMessageList attachments', () => {
	it('shows a chip under the question for each attachment', () => {
		const w = mountList([{ role: 'user', content: 'Delivery term?', attachments: [{ name: 'offerte.pdf', fileId: 7 }, { name: 'notes.txt' }] }])
		const chips = w.findAll('.cn-ai-message-list__item--user .cn-ai-message-list__chip')
		expect(chips.length).toBe(2)
		expect(chips.at(0).attributes('href')).toBe('/index.php/f/7')
		expect(chips.at(1).element.tagName).toBe('SPAN')
	})

	it('shows an image answer as a preview thumbnail linked to the file', () => {
		const w = mountList([{ role: 'assistant', content: 'Here.', attachments: [{ fileId: 42, name: 'green-roof.png', mimeType: 'image/png' }] }])
		const link = w.find('.cn-ai-message-list__thumb')
		expect(link.attributes('href')).toBe('/index.php/f/42')
		expect(link.attributes('target')).toBe('_blank')
		const img = link.find('img')
		expect(img.attributes('src')).toBe('/index.php/core/preview?fileId=42&x=256&y=256&a=1')
		expect(img.attributes('alt')).toBe('green-roof.png')
	})

	it('shows a non-image answer attachment as a chip that opens the file', () => {
		const w = mountList([{ role: 'assistant', content: 'Done', attachments: [{ fileId: 9, name: 'report.pdf', mimeType: 'application/pdf', size: 2048 }] }])
		const chip = w.find('.cn-ai-message-list__item--assistant .cn-ai-message-list__chip')
		expect(chip.text()).toBe('report.pdf (application/pdf, 2 KB)')
		expect(chip.attributes('href')).toBe('/index.php/f/9')
	})

	it('shows each notice above the answer', () => {
		const notice = 'This model does not read PDFs directly. hermiq used the text of offerte-2026.pdf instead.'
		const w = mountList([{ role: 'assistant', content: 'Answer', attachmentNotices: [notice] }])
		const bubble = w.find('.cn-ai-message-list__bubble--assistant')
		const notices = bubble.findAll('[data-testid="cn-ai-message-notice"]')
		expect(notices.length).toBe(1)
		expect(notices.at(0).text()).toBe(notice)
		expect(bubble.html().indexOf('cn-ai-message-notice')).toBeLessThan(bubble.html().indexOf('Answer'))
	})

	it('renders a message without attachments exactly as before', () => {
		const w = mountList([{ role: 'user', content: 'Hi' }, { role: 'assistant', content: 'Hello' }])
		expect(w.find('[data-testid="cn-ai-message-attachments"]').exists()).toBe(false)
		expect(w.find('[data-testid="cn-ai-message-notice"]').exists()).toBe(false)
	})
})
