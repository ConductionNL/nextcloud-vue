/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnConflictResolveCard - the `conflict-resolve` widget.
 *
 * Guarded: registered in the dashboard catalog; one card per open conflict
 * record with the device's and the other version of each differing field;
 * resolved records and records without a difference draw nothing; the buttons
 * stay disabled (with the reason) until the named capability is announced;
 * a choice posts `{ resolution }` to the filled url and the card leaves; a
 * refusal stays on the card in the server's words; a failed read is said.
 */
var mockGet = jest.fn()
var mockPost = jest.fn()
var mockCapabilities = jest.fn(() => ({}))

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: {
		get: (...args) => mockGet(...args),
		post: (...args) => mockPost(...args),
	},
}))

jest.mock('@nextcloud/router', () => ({
	__esModule: true,
	generateUrl: (url, params) => `/index.php${String(url).replace(/\{(\w+)\}/g, (_m, key) => (params && params[key]) || '')}`,
}))

jest.mock('@nextcloud/capabilities', () => ({
	__esModule: true,
	getCapabilities: () => mockCapabilities(),
}))

import { mount } from '@vue/test-utils'
import { getWidgetTypeEntry } from '../../src/components/CnWidgetGrid/dashboardWidgetRegistry.js'
import { conflictFields } from '../../src/utils/conflictFields.js'
import { DASHBOARD_CATALOG_WIDGET_KEYS } from '../../src/utils/libraryWidgetKeys.js'

import '../../src/components/CnConflictResolveCard/index.js'

const CnConflictResolveCard = require('../../src/components/CnConflictResolveCard/CnConflictResolveCard.vue').default

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

const OPEN = {
	id: 'c-1',
	conflictType: 'concurrent_edit',
	conflictFields: ['finding'],
	clientVersion: { finding: 'Bijgebouw 4 bij 6 meter, in de groenstrook.', updated: 'a' },
	serverVersion: { finding: 'Bijgebouw circa 24 m², zonder vergunning.', updated: 'b' },
}

const CONTENT = {
	source: { register: 'dossiq', schema: 'conflictRecord', filter: { resolution: { isnull: true } }, limit: 3 },
	title: 'Conflict: welke tekst houdt u?',
	localText: 'Op dit toestel: "{value}"',
	officeText: 'Op kantoor: "{value}"',
	keepLocalLabel: 'Deze houden',
	keepOfficeLabel: 'Die van kantoor',
	resolve: { url: '/apps/dossiq/api/conflict-records/{id}/resolve', capability: 'dossiq.conflictResolution' },
}

/**
 * @param {object} [content] The content.
 * @return {Promise<object>} The mounted wrapper.
 */
async function mountCard(content = CONTENT) {
	const wrapper = mount(CnConflictResolveCard, { props: { content } })
	await flush()
	return wrapper
}

beforeEach(() => {
	mockGet.mockReset()
	mockPost.mockReset()
	mockCapabilities.mockReset()
	mockCapabilities.mockReturnValue({ dossiq: { conflictResolution: true } })
	mockGet.mockResolvedValue({ data: { results: [OPEN, { ...OPEN, id: 'c-2', resolution: 'server_wins' }] } })
})

describe('conflictFields', () => {
	it('compares the fields the record names, and leaves out equal ones', () => {
		expect(conflictFields(OPEN)).toEqual([{ path: 'finding', local: OPEN.clientVersion.finding, office: OPEN.serverVersion.finding }])
		expect(conflictFields({ ...OPEN, serverVersion: OPEN.clientVersion })).toEqual([])
	})

	it('compares every top-level key without bookkeeping when the record names none', () => {
		const record = { clientVersion: { a: 1, b: 'x', id: '1', _etag: 'p' }, serverVersion: { a: 2, b: 'x', id: '2', _etag: 'q' } }
		expect(conflictFields(record)).toEqual([{ path: 'a', local: '1', office: '2' }])
	})

	it('reads dot paths and shows objects as JSON', () => {
		const record = { mine: { r: [{ c: 'een' }] }, theirs: { r: [{ c: { x: 1 } }] } }
		expect(conflictFields(record, { localPath: 'mine', officePath: 'theirs', fields: ['r.0.c'] })).toEqual([{ path: 'r.0.c', local: 'een', office: '{"x":1}' }])
	})
})

describe('CnConflictResolveCard', () => {
	it('registers the conflict-resolve widget type in the library catalog', () => {
		expect(getWidgetTypeEntry('conflict-resolve').renderer).toBe(CnConflictResolveCard)
		expect(DASHBOARD_CATALOG_WIDGET_KEYS).toContain('conflict-resolve')
	})

	it('reads the open records with the filter as OpenRegister operators', async () => {
		await mountCard()
		expect(mockGet).toHaveBeenCalledWith('/index.php/apps/openregister/api/objects/dossiq/conflictRecord', { params: { _limit: 3, 'resolution[isnull]': true } })
	})

	it('draws one card per open record with both versions and the two buttons', async () => {
		const wrapper = await mountCard()
		expect(wrapper.find('[data-testid="cn-conflict-resolve-card-c-1"]').exists()).toBe(true)
		expect(wrapper.find('[data-testid="cn-conflict-resolve-card-c-2"]').exists()).toBe(false)
		expect(wrapper.find('.cn-conflict-resolve__title').text()).toBe('Conflict: welke tekst houdt u?')
		expect(wrapper.find('[data-testid="cn-conflict-resolve-local"]').text()).toBe('Op dit toestel: "Bijgebouw 4 bij 6 meter, in de groenstrook."')
		expect(wrapper.find('[data-testid="cn-conflict-resolve-office"]').text()).toBe('Op kantoor: "Bijgebouw circa 24 m², zonder vergunning."')
		expect(wrapper.find('[data-testid="cn-conflict-resolve-local-c-1"]').text()).toBe('Deze houden')
		expect(wrapper.find('[data-testid="cn-conflict-resolve-office-c-1"]').text()).toBe('Die van kantoor')
		expect(wrapper.find('.cn-conflict-resolve__field').exists()).toBe(false)
	})

	it('names each field when several differ', async () => {
		mockGet.mockResolvedValue({ data: [{ id: 'c-3', clientVersion: { a: '1', b: '1' }, serverVersion: { a: '2', b: '2' } }] })
		const wrapper = await mountCard({ ...CONTENT, fieldLabels: { a: 'Bevinding' } })
		expect(wrapper.findAll('.cn-conflict-resolve__field').map((node) => node.text())).toEqual(['Bevinding', 'b'])
	})

	it('draws nothing without an open conflict', async () => {
		mockGet.mockResolvedValue({ data: { results: [] } })
		const wrapper = await mountCard()
		expect(wrapper.find('[data-testid="cn-conflict-resolve"]').exists()).toBe(false)
	})

	it('keeps the buttons off, with the reason, until the capability is announced', async () => {
		mockCapabilities.mockReturnValue({})
		const wrapper = await mountCard()
		const button = wrapper.find('[data-testid="cn-conflict-resolve-local-c-1"]')
		expect(button.attributes('disabled')).toBeDefined()
		const reasonId = button.attributes('aria-describedby')
		expect(wrapper.find(`#${reasonId}`).text()).toBe('Choosing a version is not possible here yet.')
		await button.trigger('click')
		expect(mockPost).not.toHaveBeenCalled()
	})

	it('keeps the buttons off without a resolve url', async () => {
		const wrapper = await mountCard({ ...CONTENT, resolve: {} })
		expect(wrapper.find('[data-testid="cn-conflict-resolve-office-c-1"]').attributes('disabled')).toBeDefined()
	})

	it('posts the chosen resolution to the filled url and drops the card', async () => {
		mockPost.mockResolvedValue({ data: {} })
		const wrapper = await mountCard()
		await wrapper.find('[data-testid="cn-conflict-resolve-office-c-1"]').trigger('click')
		await flush()
		expect(mockPost).toHaveBeenCalledWith('/index.php/apps/dossiq/api/conflict-records/c-1/resolve', { resolution: 'server_wins' })
		expect(wrapper.emitted('resolved')).toEqual([[{ id: 'c-1', resolution: 'server_wins' }]])
		expect(wrapper.find('[data-testid="cn-conflict-resolve-card-c-1"]').exists()).toBe(false)
	})

	it('sends the configured resolution value for the device version', async () => {
		mockPost.mockResolvedValue({ data: {} })
		const wrapper = await mountCard({ ...CONTENT, resolve: { ...CONTENT.resolve, resolutions: { local: 'mine' } } })
		await wrapper.find('[data-testid="cn-conflict-resolve-local-c-1"]').trigger('click')
		await flush()
		expect(mockPost).toHaveBeenCalledWith('/index.php/apps/dossiq/api/conflict-records/c-1/resolve', { resolution: 'mine' })
	})

	it('keeps the card and shows the server words on a refusal', async () => {
		mockPost.mockRejectedValue({ response: { data: { message: 'Het dossier is intussen gesloten.' } } })
		const wrapper = await mountCard()
		await wrapper.find('[data-testid="cn-conflict-resolve-local-c-1"]').trigger('click')
		await flush()
		expect(wrapper.find('[data-testid="cn-conflict-resolve-card-c-1"]').exists()).toBe(true)
		expect(wrapper.find('[role="alert"]').text()).toBe('Het dossier is intussen gesloten.')
	})

	it('says so when the records cannot be read', async () => {
		mockGet.mockRejectedValue(new Error('500'))
		const wrapper = await mountCard()
		expect(wrapper.find('[data-testid="cn-conflict-resolve-error"]').text()).toBe('The conflicts could not be read.')
	})
})
