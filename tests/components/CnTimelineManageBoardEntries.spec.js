/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqZaakHistorie entries as the board draws them: what the entry is about
 * after its message ("Document beoordeeld: Mail aannemer over planning"), the
 * author by display name rather than the user id, a short moment ("16 okt,
 * 13:20") with `momentFormat: "short"`, and the icon the entry's kind
 * declares in the rail circle.
 */

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({
	generateUrl: jest.fn((path) => `/index.php${path}`),
}))
jest.mock('../../src/utils/userAutocomplete.js', () => ({
	resolveNextcloudUser: jest.fn(async (uid) => ({ id: uid, label: { pieter: 'Pieter Jansen' }[uid] || uid })),
}))

const fs = require('fs')
const path = require('path')
const axios = require('@nextcloud/axios').default
const { mount, flushPromises } = require('@vue/test-utils')
const CnTimelineWidget = require('../../src/components/CnTimelineWidget/CnTimelineWidget.vue').default
const { clearUserDisplayNames } = require('../../src/utils/userDisplayName.js')

const TIMELINE = '/index.php/apps/openregister/api/objects/reg/case/c-1/timeline'

const ENTRIES = [
	{ id: 'e1', message: 'Document beoordeeld', kind: 'document', author: 'pieter', created: '2026-10-16T11:20:00Z', visibility: 'internal', fields: { act: 'reviewed', title: 'Mail aannemer over planning' } },
	{ id: 'e2', message: 'Zaak opgepakt', kind: 'toewijzing', author: 'someone', created: '2026-10-14T09:10:00Z', visibility: 'internal' },
]

const stubs = {
	NcButton: { template: '<button v-bind="$attrs"><slot /></button>' },
	NcSelect: true,
	NcLoadingIcon: true,
	NcEmptyContent: true,
	NcNoteCard: true,
	NcCheckboxRadioSwitch: true,
	CnIcon: { props: ['name', 'size'], template: '<i class="stub-icon" :data-name="name" />' },
}

/**
 * Mount the manage timeline over the two entries.
 *
 * @param {object} content Extra content.
 * @return {Promise<object>} The wrapper.
 */
async function mountManage(content = {}) {
	axios.get.mockImplementation((url) => {
		if (url.endsWith('/timeline/kinds')) {
			return Promise.resolve({ data: { results: [{ slug: 'document', title: 'Documenten', icon: 'FileDocumentOutline' }, { slug: 'toewijzing', title: 'Toewijzing' }] } })
		}
		if (url.endsWith('/timeline/text-blocks')) {
			return Promise.resolve({ data: { results: [] } })
		}
		if (url === TIMELINE) {
			return Promise.resolve({ data: { canManage: true, results: ENTRIES } })
		}
		return Promise.reject(new Error(`unexpected ${url}`))
	})
	const wrapper = mount(CnTimelineWidget, {
		props: { register: 'reg', schema: 'case', objectId: 'c-1', content: { manage: true, ...content } },
		global: { stubs },
	})
	await flushPromises()
	await flushPromises()
	return wrapper
}

beforeEach(() => {
	axios.get.mockReset()
	clearUserDisplayNames()
})

describe('CnTimelineManage board entries', () => {
	it('writes what the entry is about after its message', async () => {
		const wrapper = await mountManage()
		const [first, second] = wrapper.findAll('[data-testid="cn-timeline-entry"]')
		expect(first.find('.cn-timeline-manage__message').text()).toBe('Document beoordeeld: Mail aannemer over planning')
		expect(first.find('.cn-timeline-manage__detail').exists()).toBe(true)
		expect(second.find('.cn-timeline-manage__detail').exists()).toBe(false)
	})

	it('names the author by display name, the user id while none is known', async () => {
		const wrapper = await mountManage()
		const authors = wrapper.findAll('.cn-timeline-manage__author').map((node) => node.text())
		expect(authors).toEqual(['Pieter Jansen', 'someone'])
	})

	it('writes a short moment with momentFormat short', async () => {
		const wrapper = await mountManage({ momentFormat: 'short' })
		const moment = wrapper.find('.cn-timeline-manage__moment').text()
		expect(moment).toMatch(/16/)
		expect(moment).toMatch(/,\s*\d{2}:\d{2}$/)
		expect(moment).not.toMatch(/2026/)
	})

	it('shows the icon its kind declares, none for a kind without one', async () => {
		const wrapper = await mountManage()
		const [first, second] = wrapper.findAll('[data-testid="cn-timeline-entry"]')
		expect(first.find('[data-testid="cn-timeline-entry-icon"] .stub-icon').attributes('data-name')).toBe('FileDocumentOutline')
		expect(second.find('[data-testid="cn-timeline-entry-icon"]').exists()).toBe(false)
	})

	it('draws the detail in the normal weight and the icon over the rail circle on the board look', () => {
		const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8')
		expect(css).toContain('.cn-look-board .cn-timeline-manage__detail:not(.cn-look-nextcloud *) {\n\tfont-weight: 400;')
		expect(css).toContain('.cn-look-board .cn-timeline-manage__entry:has(> .cn-timeline-manage__entry-icon):not(.cn-look-nextcloud *)::before')
	})
})
