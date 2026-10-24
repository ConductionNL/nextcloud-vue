/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Saved views shared with groups: the share fields, the save dialog, the two
 * groups in the control and what a received view lets the user do.
 *
 * @spec openspec/changes/saved-views-shared-by-role/tasks.md#task-1
 */
jest.mock('@nextcloud/l10n', () => ({
	translate: (app, text, params) => String(text).replace(/\{(\w+)\}/g, (_, key) => String((params || {})[key] ?? `{${key}}`)),
}))
const mockSearch = jest.fn()
jest.mock('../../src/utils/searchGroupSharees.js', () => ({ __esModule: true, searchGroupSharees: (...a) => mockSearch(...a), searchUserAndGroupSharees: (...a) => mockSearch(...a) }))

const { flushPromises, mount } = require('@vue/test-utils')
const CnSavedViewShareFields = require('../../src/components/CnSavedViewShareFields/CnSavedViewShareFields.vue').default
const CnSaveViewDialog = require('../../src/components/CnSaveViewDialog/CnSaveViewDialog.vue').default
const CnSavedViewsPanel = require('../../src/components/CnSavedViewsPanel/CnSavedViewsPanel.vue').default
const { buildViewCreatePayload, normalizeSharedWith, viewAccess } = require('../../src/utils/savedViewHelpers.js')

const view = (id, extra = {}) => ({ id, slug: String(id), name: `View ${id}`, owner: 'alice', ...extra })
const mountControl = (views) => mount(CnSavedViewsPanel, { props: { views, currentUserId: 'alice' } })
const testids = (w, id) => w.findAll(`[data-testid="${id}"]`)
/**
 * The panel renders each view's own menu in its row; kept as a helper so
 * the gating tests read as before.
 *
 * @param {object} w The wrapper.
 * @return {Promise<object>} The wrapper.
 */
async function manage(w) {
	return w
}

beforeEach(() => {
	mockSearch.mockReset()
	mockSearch.mockResolvedValue([{ id: 'desk', label: 'Handling desk' }, { id: 'legal', label: 'Legal' }])
})

describe('viewAccess', () => {
	it('prefers @self.access', () => {
		expect(viewAccess({ owner: 'bob', '@self': { access: 'write' } }, 'alice')).toBe('write')
		expect(viewAccess({ owner: 'alice', '@self': { access: 'read' } }, 'alice')).toBe('read')
	})
	it('falls back to comparing owner with the current user', () => {
		expect(viewAccess({ owner: 'alice' }, 'alice')).toBe('owner')
		expect(viewAccess({ owner: 'bob', isPublic: true }, 'alice')).toBe('read')
	})
})

describe('buildViewCreatePayload sharedWith', () => {
	it('carries a cleaned audience and omits it when empty', () => {
		const body = buildViewCreatePayload({ name: 'x', state: {}, sharedWith: [{ group: 'desk', mode: 'write' }, { group: 'desk', mode: 'read' }, { group: '', mode: 'read' }, { group: 'legal', mode: 'nonsense' }] })
		expect(body.sharedWith).toEqual([{ group: 'desk', mode: 'write' }, { group: 'legal', mode: 'read' }])
		expect('sharedWith' in buildViewCreatePayload({ name: 'x', state: {}, sharedWith: [] })).toBe(false)
		expect(normalizeSharedWith(null)).toEqual([])
		expect(normalizeSharedWith([{ user: 'fatma', mode: 'write' }, { user: 'fatma', mode: 'read' }, { user: 'x', group: 'y', mode: 'read' }, { group: 'fatma', mode: 'read' }]))
			.toEqual([{ user: 'fatma', mode: 'write' }, { group: 'fatma', mode: 'read' }])
	})
})

describe('CnSavedViewShareFields', () => {
	it('renders nothing when the sharee API answers no groups', async () => {
		mockSearch.mockResolvedValue([])
		const w = mount(CnSavedViewShareFields)
		await flushPromises()
		expect(w.find('[data-testid="cn-saved-view-share"]').exists()).toBe(false)
	})

	it('offers the groups and starts a picked group in read mode', async () => {
		const w = mount(CnSavedViewShareFields)
		await flushPromises()
		expect(w.find('[data-testid="cn-saved-view-share"]').exists()).toBe(true)
		w.vm.onGroups([{ id: 'desk', label: 'Handling desk' }])
		expect(w.emitted('update:modelValue').at(-1)[0]).toEqual([{ group: 'desk', mode: 'read' }])
	})

	it('changes the mode of one group and keeps the others', async () => {
		const w = mount(CnSavedViewShareFields, { props: { modelValue: [{ group: 'desk', mode: 'read' }, { group: 'legal', mode: 'read' }] } })
		await flushPromises()
		w.vm.onMode('legal', 'write')
		expect(w.emitted('update:modelValue').at(-1)[0]).toEqual([{ group: 'desk', mode: 'read' }, { group: 'legal', mode: 'write' }])
	})

	it('offers people beside groups and picks a person as a user share', async () => {
		mockSearch.mockResolvedValue([{ id: 'fatma', kind: 'user', label: 'Fatma Yilmaz' }, { id: 'desk', kind: 'group', label: 'Handling desk' }])
		const w = mount(CnSavedViewShareFields)
		await flushPromises()
		expect(w.vm.options).toEqual([{ id: 'user:fatma', label: 'Fatma Yilmaz' }, { id: 'desk', label: 'Handling desk' }])
		w.vm.onGroups(w.vm.options)
		expect(w.emitted('update:modelValue').at(-1)[0]).toEqual([{ user: 'fatma', mode: 'read' }, { group: 'desk', mode: 'read' }])
	})

	it('changes the mode of a user share by its key and labels it by name', async () => {
		mockSearch.mockResolvedValue([{ id: 'fatma', kind: 'user', label: 'Fatma Yilmaz' }])
		const w = mount(CnSavedViewShareFields, { props: { modelValue: [{ user: 'fatma', mode: 'read' }, { group: 'desk', mode: 'read' }] } })
		await flushPromises()
		expect(w.vm.labelOf('user:fatma')).toBe('Fatma Yilmaz')
		w.vm.onMode('user:fatma', 'write')
		expect(w.emitted('update:modelValue').at(-1)[0]).toEqual([{ user: 'fatma', mode: 'write' }, { group: 'desk', mode: 'read' }])
	})

	it('keeps an existing audience visible even when the search is empty', async () => {
		mockSearch.mockResolvedValue([])
		const w = mount(CnSavedViewShareFields, { props: { modelValue: [{ group: 'desk', mode: 'read' }] } })
		await flushPromises()
		expect(w.find('[data-testid="cn-saved-view-share"]').exists()).toBe(true)
	})
})

describe('CnSaveViewDialog', () => {
	it('confirms with sharedWith: [] when no group is picked', async () => {
		const w = mount(CnSaveViewDialog)
		await w.setData({ name: 'Mine' })
		w.vm.onConfirm()
		expect(w.emitted('confirm')[0][0]).toEqual({ name: 'Mine', description: '', icon: '', isPublic: false, sharedWith: [] })
	})

	it('confirms with the chosen audience', async () => {
		const w = mount(CnSaveViewDialog)
		await flushPromises()
		await w.setData({ name: 'Desk list', sharedWith: [{ group: 'desk', mode: 'read' }] })
		w.vm.onConfirm()
		expect(w.emitted('confirm')[0][0].sharedWith).toEqual([{ group: 'desk', mode: 'read' }])
	})

	it('shows the server message and stays open after a refused save', async () => {
		const w = mount(CnSaveViewDialog)
		await w.setData({ name: 'x' })
		w.vm.onConfirm()
		w.vm.setError('You may not share with that group')
		expect(w.vm.loading).toBe(false)
		expect(w.vm.error).toBe('You may not share with that group')
	})
})

describe('CnSavedViewsPanel sections and gating', () => {
	const own = view(1, { '@self': { access: 'owner' } })
	const readOnly = view(2, { owner: 'bob', sharedWith: [{ group: 'desk', mode: 'read' }], '@self': { access: 'read' } })
	const writable = view(3, { owner: 'bob', sharedWith: [{ group: 'desk', mode: 'write' }], '@self': { access: 'write' } })

	it('renders one plain list when nothing is shared with the user', () => {
		const w = mountControl([own, view(4)])
		expect(w.find('[data-testid="cn-saved-views-section-mine"]').exists()).toBe(false)
		expect(w.find('[data-testid="cn-saved-views-section-shared"]').exists()).toBe(false)
		expect(testids(w, 'cn-saved-views-item')).toHaveLength(2)
	})

	it('groups my views and shared views from one response, with who shared it on the shared row', () => {
		const w = mountControl([own, readOnly])
		expect(w.get('[data-testid="cn-saved-views-section-mine"]').text()).toContain('My views')
		expect(w.get('[data-testid="cn-saved-views-section-shared"]').text()).toContain('Shared with me')
		const items = testids(w, 'cn-saved-views-item')
		expect(items[0].attributes('data-view-id')).toBe('1')
		expect(items[1].attributes('data-view-id')).toBe('2')
		expect(items[1].text()).toContain('By bob')
		expect(items[0].text()).not.toContain('By ')
	})

	it('read access hides delete and share, and offers Save a copy', async () => {
		const w = await manage(mountControl([readOnly]), 2)
		expect(testids(w, 'cn-saved-views-delete')).toHaveLength(0)
		expect(testids(w, 'cn-saved-views-share')).toHaveLength(0)
		expect(testids(w, 'cn-saved-views-update')).toHaveLength(0)
		expect(testids(w, 'cn-saved-views-copy')).toHaveLength(1)
	})

	it('write access allows saving changes and a copy, hides delete and share', async () => {
		const w = await manage(mountControl([writable]), 3)
		expect(testids(w, 'cn-saved-views-update')).toHaveLength(1)
		expect(testids(w, 'cn-saved-views-delete')).toHaveLength(0)
		expect(testids(w, 'cn-saved-views-share')).toHaveLength(0)
		expect(testids(w, 'cn-saved-views-copy')).toHaveLength(1)
	})

	it('owner access offers Share and Delete', async () => {
		const w = await manage(mountControl([own]), 1)
		expect(testids(w, 'cn-saved-views-share')).toHaveLength(1)
		expect(testids(w, 'cn-saved-views-delete')).toHaveLength(1)
	})

	it('emits the view on each request', async () => {
		const w = mountControl([own, readOnly, writable])
		await w.get('[data-testid="cn-saved-views-share"][data-view-id="1"]').trigger('click')
		await w.get('[data-testid="cn-saved-views-copy"][data-view-id="2"]').trigger('click')
		await w.get('[data-testid="cn-saved-views-update"][data-view-id="3"]').trigger('click')
		expect(w.emitted('share-request')[0][0].id).toBe(1)
		expect(w.emitted('copy-request')[0][0].id).toBe(2)
		expect(w.emitted('update-request')[0][0].id).toBe(3)
	})

	it('applies a shared view like an own one', async () => {
		const w = mountControl([readOnly])
		await testids(w, 'cn-saved-views-item')[0].trigger('click')
		expect(w.emitted('apply')[0][0].id).toBe(2)
	})
})

describe('presentation (view-presentation-picker)', () => {
	const SCHEMA = { properties: { status: { type: 'string', enum: ['a', 'b'] }, due: { type: 'string', format: 'date' } } }

	it('CnSaveViewDialog without a schema renders no picker and emits no presentation', async () => {
		const w = mount(CnSaveViewDialog)
		await w.setData({ name: 'x' })
		w.vm.onConfirm()
		expect(w.find('[data-testid="cn-view-presentation-picker"]').exists()).toBe(false)
		expect(w.emitted('confirm')[0][0]).not.toHaveProperty('presentation')
	})

	it('with a schema it shows the picker and emits the chosen board', async () => {
		const w = mount(CnSaveViewDialog, { props: { schema: SCHEMA } })
		await flushPromises()
		expect(w.find('[data-testid="cn-view-presentation-picker"]').exists()).toBe(true)
		await w.setData({ name: 'Board', presentation: { viewType: 'kanban', kanban: { groupByField: 'status' } } })
		w.vm.onConfirm()
		expect(w.emitted('confirm')[0][0].presentation).toEqual({ viewType: 'kanban', kanban: { groupByField: 'status' } })
	})

	it('blocks Save while a board has no group field', async () => {
		const w = mount(CnSaveViewDialog, { props: { schema: SCHEMA } })
		await w.setData({ name: 'x', presentation: { viewType: 'kanban', kanban: {} } })
		expect(w.vm.presentationComplete).toBe(false)
	})

	it('routes a refusal naming a presentation path under its picker, other messages to the top', async () => {
		const w = mount(CnSaveViewDialog, { props: { schema: SCHEMA } })
		w.vm.setError('calendar.dateField: not a property of the schema')
		expect(w.vm.pathErrors).toEqual({ 'calendar.dateField': 'calendar.dateField: not a property of the schema' })
		expect(w.vm.error).toBe('')
		w.vm.setError('Something else')
		expect(w.vm.error).toBe('Something else')
	})

	it('the saved-views panel offers no Presentation entry, as the boards draw none', () => {
		const owner = view(1, { '@self': { access: 'owner' } })
		expect(testids(mountControl([owner]), 'cn-saved-views-presentation')).toHaveLength(0)
	})

	it('buildViewCreatePayload carries a board or calendar and omits a table', () => {
		expect(buildViewCreatePayload({ name: 'x', state: {}, presentation: { viewType: 'kanban', kanban: { groupByField: 's' } } }).presentation).toEqual({ viewType: 'kanban', kanban: { groupByField: 's' } })
		expect('presentation' in buildViewCreatePayload({ name: 'x', state: {}, presentation: { viewType: 'table' } })).toBe(false)
	})
})
