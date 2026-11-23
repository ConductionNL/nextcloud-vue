/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A user field reads its display name. The Zuiddrecht rehearsal showed
 * "Toegewezen aan thomas.kuiper": the read mode printed the stored uid.
 *
 * @spec openspec/changes/a-user-field-reads-its-display-name/specs/data-display/spec.md#requirement-a-user-field-shows-the-users-display-name
 */
import { flushPromises, shallowMount } from '@vue/test-utils'
import CnObjectDataWidget from '../../src/components/CnObjectDataWidget/CnObjectDataWidget.vue'
import { resolveNextcloudUser } from '../../src/utils/userAutocomplete.js'

jest.mock('../../src/utils/userAutocomplete.js', () => ({
	searchNextcloudUsers: jest.fn(async () => []),
	searchNextcloudGroups: jest.fn(async () => []),
	resolveNextcloudUser: jest.fn(),
}))
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(async () => ({ data: {} })) } }))

const SCHEMA = {
	properties: {
		title: { type: 'string' },
		assignee: { type: 'string', referenceType: 'nextcloud-user', title: 'Assignee' },
	},
}

/**
 * Mount the widget, read-only, over a case.
 *
 * @param {object} objectData The object.
 * @return {object} The wrapper.
 */
function mountWidget(objectData) {
	return shallowMount(CnObjectDataWidget, {
		propsData: { schema: SCHEMA, objectData, objectType: 'case', editable: false },
		stubs: { CnWidgetWrapper: { template: '<div><slot /></div>' }, CnFormDialog: true, CnObjectMetadataModal: true },
		mocks: { t: (_app, s) => s },
	})
}

describe('CnObjectDataWidget user field in read mode', () => {
	beforeEach(() => {
		resolveNextcloudUser.mockReset()
		resolveNextcloudUser.mockImplementation(async (uid) => ({ id: uid, label: uid === 'thomas.kuiper' ? 'Thomas Kuiper' : uid }))
	})

	it('shows the display name, not the uid', async () => {
		const w = mountWidget({ id: '1', title: 'Zaak', assignee: 'thomas.kuiper' })
		await flushPromises()

		const cell = w.find('.cn-object-data-widget__users')
		expect(cell.exists()).toBe(true)
		expect(cell.text()).toBe('Thomas Kuiper')
		expect(cell.attributes('title')).toBe('thomas.kuiper')
		expect(resolveNextcloudUser).toHaveBeenCalledWith('thomas.kuiper')
	})

	it('control: a uid the directory cannot name still shows the uid', async () => {
		const w = mountWidget({ id: '1', title: 'Zaak', assignee: 'ghost' })
		await flushPromises()

		expect(w.find('.cn-object-data-widget__users').text()).toBe('ghost')
	})

	it('control: a plain text field is not looked up as a user', async () => {
		mountWidget({ id: '1', title: 'thomas.kuiper' })
		await flushPromises()

		expect(resolveNextcloudUser).not.toHaveBeenCalled()
	})
})
