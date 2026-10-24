/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A reply saved as a draft comes back (DqZaakContact "Opslaan als concept").
 *
 * @spec openspec/changes/conversation-reply-draft/specs/conversation-reply-draft/spec.md
 */
import { flushPromises, mount } from '@vue/test-utils'
import CnConversationWidget from '../../src/components/CnConversationThread/CnConversationWidget.vue'

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: {
		get: jest.fn(async () => ({ data: { text: 'De stukken zijn verzameld.' } })),
		put: jest.fn(async (url, body) => ({ data: { text: body.text, savedAt: '2026-10-24T18:05:00Z' } })),
		post: jest.fn(async () => ({ data: {} })),
	},
}))
jest.mock('@nextcloud/router', () => ({ generateUrl: (path) => path }))

function mountWidget(draft = { url: '/apps/x/api/cases/@objectId/reply-draft' }) {
	return mount(CnConversationWidget, {
		props: {
			content: { field: 'messages', endpoint: '/apps/x/api/cases/@objectId/messages', ...(draft ? { draft } : {}) },
			objectId: 'case-1',
			objectData: { id: 'case-1', messages: [] },
		},
		global: { provide: { cnTranslate: (key) => key }, stubs: { NcButton: { props: ['type'], template: '<button :type="type || \'button\'" @click="$emit(\'click\')"><slot /></button>' } } },
	})
}

describe('CnConversationWidget reply draft', () => {
	it('reads the saved draft into the reply box', async () => {
		const axios = (await import('@nextcloud/axios')).default
		const w = mountWidget()
		await flushPromises()
		expect(axios.get).toHaveBeenCalledWith('/apps/x/api/cases/case-1/reply-draft')
		expect(w.find('textarea').element.value).toBe('De stukken zijn verzameld.')
	})

	it('saves the box as a draft and says so', async () => {
		const axios = (await import('@nextcloud/axios')).default
		const w = mountWidget()
		await flushPromises()
		await w.find('textarea').setValue('Nog een zin.')
		await w.find('[data-testid="cn-conversation-save-draft"]').trigger('click')
		await flushPromises()
		expect(axios.put).toHaveBeenCalledWith('/apps/x/api/cases/case-1/reply-draft', { text: 'Nog een zin.' })
		expect(w.find('[data-testid="cn-conversation-draft-status"]').exists()).toBe(true)
	})

	it('offers no draft button without content.draft', async () => {
		const w = mountWidget(null)
		await flushPromises()
		expect(w.find('[data-testid="cn-conversation-save-draft"]').exists()).toBe(false)
	})
})
