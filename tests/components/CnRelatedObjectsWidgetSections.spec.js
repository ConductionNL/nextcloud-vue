/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * related-sections: `layout: "sections"` draws related items as one section
 * per kind (board PqTicketGerelateerd: Appointments, Client, Case, Documents),
 * each with a count chip, an optional "Link item" action and, when empty, its
 * sentence in a dashed box. A configured section can keep the related
 * objects of one schema, so the one `objects` group splits per kind.
 *
 * @spec openspec/changes/related-sections/specs/related-sections/spec.md#requirement-related-items-can-be-drawn-as-sections-per-kind
 */

import { mount } from '@vue/test-utils'
import CnRelatedObjectsWidget from '../../src/components/CnRelatedObjectsWidget/CnRelatedObjectsWidget.vue'
import { integrations } from '../../src/integrations/registry.js'

jest.mock('@nextcloud/event-bus', () => ({
	emit: jest.fn(),
	subscribe: jest.fn(),
	unsubscribe: jest.fn(),
}))

jest.mock('@nextcloud/router', () => ({
	generateUrl: (tpl, params = {}) => tpl.replace(/\{(\w+)\}/g, (_, k) => params[k]),
}))

const stubs = {
	CnWidgetWrapper: { template: '<div class="cn-widget-wrapper-stub"><slot /><slot name="footer" /></div>' },
	CnIcon: true,
	FileTreeOutline: true,
	Paperclip: true,
	ChevronRight: true,
	CnActionButtons: { name: 'CnActionButtons', props: ['actions'], template: '<div class="actions-stub" />' },
}

const SELF = { '@self': { register: 'pipelinq', schema: 'ticket', id: 'T1' } }

const BODIES = {
	relations: {},
	uses: { results: [
		{ id: 'k1', name: 'Sanne de Vries', '@self': { id: 'k1', schema: 'client' } },
	], total: 1 },
	used: { results: [
		{ id: 'a1', title: 'Location visit Parkstraat', '@self': { id: 'a1', schema: 'booking' } },
	], total: 1 },
	files: { results: [], total: 0 },
}

/**
 * @return {Promise<void>}
 */
async function flush() {
	for (let i = 0; i < 4; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
	}
}

/**
 * @param {object} props Widget props.
 * @return {Promise<object>} Wrapper.
 */
async function mountWidget(props) {
	global.fetch = jest.fn((url) => {
		const suffix = String(url).split('?')[0].split('/').pop()
		return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(BODIES[suffix] ?? {}) })
	})
	const w = mount(CnRelatedObjectsWidget, {
		props: { objectData: SELF, layout: 'sections', ...props },
		global: { stubs, provide: { cnTranslate: (key) => `T(${key})` } },
	})
	await flush()
	return w
}

describe('CnRelatedObjectsWidget — sections', () => {
	beforeEach(() => {
		integrations.__resetForTests()
		global.OC = { requestToken: 'tok' }
	})

	afterEach(() => {
		delete global.fetch
		delete global.OC
	})

	it('splits the related objects per schema and shows the empty sentence and the link action', async () => {
		const w = await mountWidget({
			sections: [
				{ key: 'appointments', label: 'Appointments', icon: 'CalendarOutline', group: 'objects', schema: 'booking' },
				{ key: 'client', label: 'Client', icon: 'AccountOutline', group: 'objects', schema: 'client' },
				{ key: 'case', label: 'Case', icon: 'FolderOutline', group: 'objects', schema: 'case', emptyText: 'No case linked yet.' },
				{ key: 'documents', label: 'Documents', group: 'files', emptyText: 'No documents yet.', action: { label: 'Link item', type: 'open-modal', target: 'LinkFile' } },
			],
		})
		const sections = w.findAll('.cn-related-objects-widget__section')
		expect(sections.map((s) => s.find('.cn-related-objects-widget__section-title').text())).toEqual(['T(Appointments) 1', 'T(Client) 1', 'T(Case) 0', 'T(Documents) 0'])
		expect(sections[0].find('.cn-related-objects-widget__section-label').text()).toBe('Location visit Parkstraat')
		expect(sections[1].find('.cn-related-objects-widget__section-label').text()).toBe('Sanne de Vries')
		expect(sections[2].find('[data-testid="cn-related-section-empty"]').text()).toBe('T(No case linked yet.)')
		const action = sections[3].findComponent({ name: 'CnActionButtons' }).props('actions')
		expect(action).toHaveLength(1)
		expect(action[0]).toMatchObject({ label: 'T(Link item)', type: 'open-modal', target: 'LinkFile', inline: true })
		expect(w.find('.cn-related-objects-widget__tabs').exists()).toBe(false)
	})

	it('opens a related object through the host', async () => {
		const w = await mountWidget({ sections: [{ key: 'client', label: 'Client', group: 'objects', schema: 'client' }] })
		await w.find('.cn-related-objects-widget__section-open').trigger('click')
		expect(w.emitted('select-object')[0][0].id).toBe('k1')
	})

	it('draws every non-empty group as a section without configured sections', async () => {
		const w = await mountWidget({})
		expect(w.findAll('.cn-related-objects-widget__section')).toHaveLength(1)
		expect(w.find('.cn-related-objects-widget__section-rows').findAll('li')).toHaveLength(2)
	})
})
