/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/nextcloud-group-surfaces/specs/data-display/spec.md#requirement-the-inline-editor-picks-a-nextcloud-group-or-user
 */
import { flushPromises, shallowMount } from '@vue/test-utils'
import CnObjectDataWidget from '../../src/components/CnObjectDataWidget/CnObjectDataWidget.vue'
import { clearGroupNameCache, searchNextcloudGroups } from '../../src/utils/groupAutocomplete.js'
import { resolveNextcloudUser, searchNextcloudUsers } from '../../src/utils/userAutocomplete.js'

jest.mock('../../src/utils/groupAutocomplete.js', () => {
	const actual = jest.requireActual('../../src/utils/groupAutocomplete.js')
	return { ...actual, searchNextcloudGroups: jest.fn() }
})
jest.mock('../../src/utils/userAutocomplete.js', () => ({
	searchNextcloudUsers: jest.fn(),
	resolveNextcloudUser: jest.fn(),
}))
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))

const GROUPS = [
	{ id: 'behandelaars', label: 'Behandelaars' },
	{ id: 'toezicht', label: 'Toezicht' },
]

const SCHEMA = {
	properties: {
		title: { type: 'string' },
		assignedGroup: { type: 'string', referenceType: 'nextcloud-group' },
		teams: { type: 'array', items: { type: 'string', referenceType: 'nextcloud-group' } },
		owner: { type: 'string', referenceType: 'nextcloud-user' },
	},
}

/**
 * Mount the widget over a case.
 *
 * @param {object} objectData The object.
 * @return {object} The wrapper.
 */
function mountWidget(objectData) {
	return shallowMount(CnObjectDataWidget, {
		propsData: { schema: SCHEMA, objectData, objectType: 'case', editable: true },
		stubs: { CnWidgetWrapper: { template: '<div><slot /></div>' }, CnFormDialog: true, CnObjectMetadataModal: true },
		mocks: { t: (_app, s) => s },
	})
}

describe('CnObjectDataWidget group and user pickers', () => {
	beforeEach(async () => {
		clearGroupNameCache()
		const axios = (await import('@nextcloud/axios')).default
		// resolveNextcloudGroup goes through the real search over axios.
		axios.get.mockResolvedValue({ data: { ocs: { data: [{ id: 'behandelaars', label: 'Behandelaars', source: 'groups' }] } } })
		searchNextcloudGroups.mockResolvedValue(GROUPS)
		searchNextcloudUsers.mockResolvedValue([{ id: 'jan', label: 'Jan Jansen', displayName: 'Jan Jansen' }])
		resolveNextcloudUser.mockImplementation(async (uid) => ({ id: uid, label: uid === 'piet' ? 'Piet Peters' : uid }))
	})

	it('derives the picker widgets from the schema', () => {
		const w = mountWidget({ id: '1' })
		const byKey = Object.fromEntries(w.vm.resolvedFields.map((f) => [f.key, f]))
		expect(w.vm.isGroupPicker(byKey.assignedGroup)).toBe(true)
		expect(w.vm.isPersonMultiple(byKey.teams)).toBe(true)
		expect(w.vm.isUserPicker(byKey.owner)).toBe(true)
		expect(w.vm.isPersonPicker(byKey.title)).toBe(false)
	})

	it('a team field opens a group select and stores the picked group id', async () => {
		const w = mountWidget({ id: '1', assignedGroup: 'behandelaars' })
		const field = w.vm.resolvedFields.find((f) => f.key === 'assignedGroup')
		w.vm.startEdit(field)
		await flushPromises()
		expect(searchNextcloudGroups).toHaveBeenCalledWith('')
		expect(w.vm.personOptions.assignedGroup).toEqual(GROUPS)
		expect(w.vm.personSelected(field)).toEqual({ id: 'behandelaars', label: 'Behandelaars', displayName: 'Behandelaars' })
		await w.vm.$nextTick()
		expect(w.find('nc-select-stub').exists()).toBe(true)
		w.vm.onPersonChange(field, { id: 'toezicht', label: 'Toezicht' })
		expect(w.vm.editData.assignedGroup).toBe('toezicht')
	})

	it('a list of teams stores a list of ids', async () => {
		const w = mountWidget({ id: '1', teams: ['behandelaars'] })
		const field = w.vm.resolvedFields.find((f) => f.key === 'teams')
		w.vm.startEdit(field)
		await flushPromises()
		w.vm.onPersonChange(field, [{ id: 'behandelaars' }, { id: 'toezicht' }])
		expect(w.vm.editData.teams).toEqual(['behandelaars', 'toezicht'])
	})

	it('a user field searches users and shows the held user by name', async () => {
		const w = mountWidget({ id: '1', owner: 'piet' })
		const field = w.vm.resolvedFields.find((f) => f.key === 'owner')
		w.vm.startEdit(field)
		await flushPromises()
		expect(searchNextcloudUsers).toHaveBeenCalledWith('')
		expect(resolveNextcloudUser).toHaveBeenCalledWith('piet')
		expect(w.vm.personSelected(field).label).toBe('Piet Peters')
		expect(w.find('nc-select-users-stub').exists()).toBe(true)
		w.vm.onPersonChange(field, { id: 'jan', label: 'Jan Jansen' })
		expect(w.vm.editData.owner).toBe('jan')
	})

	it('shows a group by its display name when not editing', async () => {
		const w = mountWidget({ id: '1', assignedGroup: 'behandelaars' })
		await flushPromises()
		expect(w.html()).toContain('cn-object-data-widget__groups')
	})
})
