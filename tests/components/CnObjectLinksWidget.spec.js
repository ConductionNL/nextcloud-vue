/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnObjectLinksWidget, the `object-links` widget: a record's links to other
 * records, kept as link objects of one schema (board PqKlant Relaties
 * "Secretaris van Buurtvereniging Oost"). Reads the links from this record,
 * names each target from the schema its type points at, adds a link (and its
 * inverse) through a dialog, and removes both.
 *
 * @spec openspec/changes/contact-side-cards-generic/specs/contact-side-cards-generic/spec.md#requirement-a-records-links-to-other-records-are-listed-added-and-removed
 */
var mockGet = jest.fn()
var mockPost = jest.fn()
var mockDelete = jest.fn()

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: {
		get: (...args) => mockGet(...args),
		post: (...args) => mockPost(...args),
		delete: (...args) => mockDelete(...args),
	},
}))

jest.mock('@nextcloud/router', () => ({
	__esModule: true,
	generateUrl: (url) => `/index.php${url}`,
}))

const { mount } = require('@vue/test-utils')
const { getWidgetTypeEntry } = require('../../src/components/CnWidgetGrid/dashboardWidgetRegistry.js')
const { DASHBOARD_CATALOG_WIDGET_KEYS } = require('../../src/utils/libraryWidgetKeys.js')
const { isContentOnlyWidgetDef } = require('../../src/utils/widgetDispatch.js')

require('../../src/components/CnObjectLinksWidget/index.js')

const CnObjectLinksWidget = require('../../src/components/CnObjectLinksWidget/CnObjectLinksWidget.vue').default

async function flush() {
	for (let i = 0; i < 6; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
	}
}

const BASE = '/index.php/apps/openregister/api/objects'

const RELATIONS = {
	register: 'pipelinq',
	schema: 'relationship',
	from: 'fromContact',
	to: 'toContact',
	fromType: 'fromType',
	toType: 'toType',
	selfType: 'contact',
	typeField: 'type',
	inverseField: 'inverseType',
	groupField: 'category',
	pair: true,
	types: [
		{ value: 'partner', label: 'Partner of', inverse: 'partner', group: 'Family' },
		{ value: 'secretaris', label: 'Secretary of', inverse: 'heeft-secretaris', group: 'Organisatie', groupLabel: 'Organisation' },
	],
	targets: [
		{ type: 'contact', register: 'pipelinq', schema: 'contact', titleField: 'name', label: 'contact', route: 'ContactDetail' },
		{ type: 'client', register: 'pipelinq', schema: 'client', titleField: 'name', label: 'client', route: 'ClientDetail' },
	],
	fields: [{ key: 'notes', label: 'Notes', type: 'textarea' }],
	defaults: { provenance: 'declared' },
	add: { label: 'Add', ariaLabel: 'Add relationship', placement: 'title' },
	remove: { label: 'Remove' },
	emptyText: 'No relationships yet.',
}

const LINKS = [
	{ id: 'r-1', fromContact: 's-1', toContact: 'o-1', toType: 'client', type: 'secretaris' },
	{ id: 'r-2', fromContact: 's-1', toContact: 'j-1', toType: 'contact', type: 'partner' },
]

/**
 * Answer the GETs the widget sends.
 *
 * @param {Array} links The links to list.
 * @return {void}
 */
function serve(links = LINKS) {
	mockGet.mockImplementation((url) => {
		if (url === `${BASE}/pipelinq/client/o-1`) {
			return Promise.resolve({ data: { id: 'o-1', name: 'Buurtvereniging Oost' } })
		}
		if (url === `${BASE}/pipelinq/contact/j-1`) {
			return Promise.resolve({ data: { id: 'j-1', name: 'J. de Vries' } })
		}
		if (url.startsWith(`${BASE}/pipelinq/relationship`)) {
			return Promise.resolve({ data: { results: links } })
		}
		return Promise.reject(new Error(`unexpected ${url}`))
	})
}

/**
 * Mount the widget.
 *
 * @param {object} content The content.
 * @return {object} The wrapper.
 */
function mountLinks(content = RELATIONS) {
	return mount(CnObjectLinksWidget, {
		props: { content, objectData: { id: 's-1', name: 'Sanne de Vries' }, objectId: 's-1' },
		global: {
			provide: { cnTranslate: (key) => (key === 'Partner of' ? 'Partner van' : key) },
			stubs: {
				'router-link': { props: ['to'], template: '<a class="router-link" :data-to="JSON.stringify(to)"><slot /></a>' },
				NcButton: { template: '<button v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>' },
				NcActions: { template: '<div class="actions-stub" v-bind="$attrs"><slot /></div>' },
				NcActionButton: { template: '<button class="action-stub" v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>' },
				CnObjectLinkDialog: { name: 'CnObjectLinkDialog', props: ['content', 'objectId'], template: '<div class="dialog-stub" />' },
			},
		},
	})
}

/**
 * The last `header` event's payload.
 *
 * @param {object} w The wrapper.
 * @return {object|null} The payload.
 */
function lastHeader(w) {
	const events = w.emitted('header') || []
	return events.length ? events[events.length - 1][0] : null
}

describe('CnObjectLinksWidget', () => {
	beforeEach(() => {
		mockGet.mockReset()
		mockPost.mockReset()
		mockDelete.mockReset()
	})

	it('registers as a renderer-only, content-only detail type in the library vocabulary', () => {
		const entry = getWidgetTypeEntry('object-links')
		expect(entry.renderer).toBe(CnObjectLinksWidget)
		expect(entry.form).toBeNull()
		expect(isContentOnlyWidgetDef({ type: 'object-links' })).toBe(true)
		expect(DASHBOARD_CATALOG_WIDGET_KEYS).toContain('object-links')
	})

	it('reads the links from this record and names each target from its own schema', async () => {
		serve()
		const w = mountLinks()
		await flush()
		const listCall = mockGet.mock.calls.find(([url]) => url.startsWith(`${BASE}/pipelinq/relationship`))
		expect(listCall[1]).toEqual({ params: { fromContact: 's-1', _limit: 100 } })
		const rows = w.findAll('[data-testid^="cn-object-links-row-"]')
		expect(rows).toHaveLength(2)
		expect(rows[0].text()).toContain('Secretary of')
		expect(rows[0].find('.router-link').text()).toBe('Buurtvereniging Oost')
		expect(JSON.parse(rows[0].find('.router-link').attributes('data-to'))).toEqual({ name: 'ClientDetail', params: { id: 'o-1' } })
		expect(rows[1].text()).toContain('Partner van')
		expect(JSON.parse(rows[1].find('.router-link').attributes('data-to'))).toEqual({ name: 'ContactDetail', params: { id: 'j-1' } })
	})

	it('shows the empty text when there are no links', async () => {
		serve([])
		const w = mountLinks()
		await flush()
		expect(w.find('[data-testid="cn-object-links-empty"]').text()).toBe('No relationships yet.')
	})

	it('reports the add for the title row, which opens the dialog', async () => {
		serve()
		const w = mountLinks()
		await flush()
		const header = lastHeader(w)
		expect(header.actions).toHaveLength(1)
		expect(header.actions[0]).toMatchObject({ label: 'Add', ariaLabel: 'Add relationship', icon: 'Plus', variant: 'secondary' })
		expect(w.find('.dialog-stub').exists()).toBe(false)
		header.actions[0].run()
		await w.vm.$nextTick()
		expect(w.find('.dialog-stub').exists()).toBe(true)
		expect(w.find('[data-testid="cn-object-links-add"]').exists()).toBe(false)
	})

	it('draws the add under the list without a title placement', async () => {
		serve()
		const w = mountLinks({ ...RELATIONS, add: { label: 'Add relationship' } })
		await flush()
		const header = lastHeader(w)
		expect(header === null || header.actions.length === 0).toBe(true)
		expect(w.find('[data-testid="cn-object-links-add"]').text()).toBe('Add relationship')
	})

	it('writes the link and its inverse', async () => {
		serve()
		mockPost.mockResolvedValue({ data: {} })
		const w = mountLinks()
		await flush()
		await w.vm.createLink({ target: { id: 'o-2', type: 'client' }, type: 'secretaris', values: { notes: 'Since 2024' } })
		expect(mockPost).toHaveBeenCalledTimes(2)
		expect(mockPost.mock.calls[0]).toEqual([`${BASE}/pipelinq/relationship`, {
			provenance: 'declared',
			notes: 'Since 2024',
			fromContact: 's-1',
			toContact: 'o-2',
			fromType: 'contact',
			toType: 'client',
			type: 'secretaris',
			inverseType: 'heeft-secretaris',
			category: 'Organisatie',
		}])
		expect(mockPost.mock.calls[1][1]).toMatchObject({
			fromContact: 'o-2',
			toContact: 's-1',
			fromType: 'client',
			toType: 'contact',
			type: 'heeft-secretaris',
			inverseType: 'secretaris',
		})
	})

	it('refuses a link that already exists before writing', async () => {
		serve()
		const w = mountLinks()
		await flush()
		const result = await w.vm.createLink({ target: { id: 'j-1', type: 'contact' }, type: 'partner', values: {} })
		expect(result).toEqual({ ok: false, message: 'This link already exists.' })
		expect(mockPost).not.toHaveBeenCalled()
	})

	it('removes the link and its inverse', async () => {
		serve()
		const w = mountLinks()
		await flush()
		mockGet.mockImplementation((url, config) => {
			if (url === `${BASE}/pipelinq/relationship` && config.params.fromContact === 'o-1') {
				return Promise.resolve({ data: { results: [{ id: 'r-9', fromContact: 'o-1', toContact: 's-1', type: 'heeft-secretaris' }, { id: 'r-8', fromContact: 'o-1', toContact: 's-1', type: 'other' }] } })
			}
			return Promise.resolve({ data: { results: [] } })
		})
		mockDelete.mockResolvedValue({ data: {} })
		await w.vm.removeLink(w.vm.rows[0])
		expect(mockDelete.mock.calls.map(([url]) => url)).toEqual([`${BASE}/pipelinq/relationship/r-1`, `${BASE}/pipelinq/relationship/r-9`])
	})

	it('shows the server\'s words when a remove is refused', async () => {
		serve()
		const w = mountLinks()
		await flush()
		mockDelete.mockRejectedValue({ response: { status: 403, data: { message: 'You may not change this record.' } } })
		await w.vm.removeLink(w.vm.rows[0])
		await w.vm.$nextTick()
		expect(w.find('[data-testid="cn-object-links-notice"]').text()).toBe('You may not change this record.')
	})

	it('sends nothing without a record id or a link schema', async () => {
		serve()
		mountLinks({ ...RELATIONS, schema: '' })
		await flush()
		expect(mockGet).not.toHaveBeenCalled()
	})
})

describe('CnObjectLinkDialog', () => {
	const CnObjectLinkDialog = require('../../src/components/CnObjectLinksWidget/CnObjectLinkDialog.vue').default

	beforeEach(() => {
		mockGet.mockReset()
	})

	/**
	 * Mount the dialog.
	 *
	 * @param {Function} save The save callback.
	 * @return {object} The wrapper.
	 */
	function mountDialog(save) {
		return mount(CnObjectLinkDialog, {
			props: { content: RELATIONS, objectId: 's-1', save },
			global: {
				provide: { cnTranslate: (key) => key },
				stubs: {
					CnDialog: { template: '<div class="dialog"><slot /><slot name="actions" /></div>' },
					CnSearchSelect: { name: 'CnSearchSelect', props: ['options'], template: '<div class="search" />' },
					NcSelect: { name: 'NcSelect', props: ['options'], template: '<div class="select" />' },
					NcTextArea: true,
					NcTextField: true,
					NcButton: { template: '<button v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>' },
				},
			},
		})
	}

	it('searches every target, leaves this record out and names each kind', async () => {
		mockGet.mockImplementation((url) => Promise.resolve({
			data: { results: url.endsWith('/contact') ? [{ id: 's-1', name: 'Sanne de Vries' }, { id: 'j-1', name: 'J. de Vries' }] : [{ id: 'o-1', name: 'Buurtvereniging Oost' }] },
		}))
		const w = mountDialog(jest.fn())
		await w.vm.search('vries')
		expect(mockGet.mock.calls.map(([url, config]) => [url, config.params])).toEqual([
			[`${BASE}/pipelinq/contact`, { _search: 'vries', _limit: 10 }],
			[`${BASE}/pipelinq/client`, { _search: 'vries', _limit: 10 }],
		])
		expect(w.vm.options).toEqual([
			{ id: 'j-1', label: 'J. de Vries', secondary: 'contact', type: 'contact' },
			{ id: 'o-1', label: 'Buurtvereniging Oost', secondary: 'client', type: 'client' },
		])
		expect(w.findComponent({ name: 'NcSelect' }).props('options')[0]).toEqual({ value: 'partner', label: 'Partner of (Family)' })
		expect(w.findComponent({ name: 'NcSelect' }).props('options')[1]).toEqual({ value: 'secretaris', label: 'Secretary of (Organisation)' })
	})

	it('saves the pick with the filled values and closes; a refusal stays in the dialog', async () => {
		const save = jest.fn().mockResolvedValueOnce({ ok: false, message: 'You may not change this record.' }).mockResolvedValueOnce({ ok: true })
		const w = mountDialog(save)
		w.vm.options = [{ id: 'o-1', label: 'Buurtvereniging Oost', type: 'client' }]
		w.vm.onPick('o-1')
		w.vm.type = 'secretaris'
		w.vm.values = { notes: 'Sinds 2024', startDate: '' }
		await w.vm.confirm()
		await w.vm.$nextTick()
		expect(save).toHaveBeenCalledWith({ target: { id: 'o-1', type: 'client' }, type: 'secretaris', values: { notes: 'Sinds 2024' } })
		expect(w.find('[data-testid="cn-object-link-dialog-refusal"]').text()).toBe('You may not change this record.')
		expect(w.emitted('close')).toBeFalsy()
		await w.vm.confirm()
		expect(w.emitted('close')).toBeTruthy()
	})
})
