/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A detail page and an index page forward the form-draft settings to the
 * forms they open (pages-forward-form-drafts): the app key always, and
 * "Save draft" only on a create form or on a record that is still a draft.
 *
 * @spec openspec/changes/pages-forward-form-drafts/specs/dialog-system/spec.md#requirement-a-page-forwards-its-form-draft-settings-to-the-forms-it-opens
 */
import { flushPromises, shallowMount } from '@vue/test-utils'
import CnDetailPage from '../../src/components/CnDetailPage/CnDetailPage.vue'
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'

const SCHEMA = { slug: 'case', title: 'Case', properties: { title: { type: 'string' }, isDraft: { type: 'boolean' } } }

function makeStore(object) {
	return {
		objects: { 'dossiq-case': { 'c-1': object } },
		schemas: { 'dossiq-case': SCHEMA },
		objectTypeRegistry: {},
		registerObjectType: jest.fn(),
		fetchObject: jest.fn(async () => null),
		fetchSchema: jest.fn(async () => null),
	}
}

const MOCKS = { t: (_a, s) => s, $route: { params: {}, query: {}, name: 'case' }, $router: { push: jest.fn(), replace: jest.fn() } }

async function editFormOf(object, extra = {}) {
	const wrapper = shallowMount(CnDetailPage, {
		props: {
			title: 'Case',
			register: 'dossiq',
			schema: 'case',
			objectId: 'c-1',
			objectStore: makeStore(object),
			draftAppId: 'dossiq',
			allowDraft: true,
			...extra,
		},
		global: { mocks: MOCKS },
	})
	await wrapper.setData({ editFormOpen: true })
	await flushPromises()
	return wrapper.findComponent({ ref: 'editFormDialog' })
}

describe('CnDetailPage: form drafts', () => {
	it('forwards the app key to the edit form', async () => {
		const dialog = await editFormOf({ id: 'c-1', title: 'A case', isDraft: false })
		expect(dialog.exists()).toBe(true)
		expect(dialog.props('draftAppId')).toBe('dossiq')
		expect(dialog.props('draftField')).toBe('isDraft')
	})

	it('offers Save draft on the edit form only while the record is still a draft', async () => {
		expect((await editFormOf({ id: 'c-1', isDraft: false })).props('allowDraft')).toBe(false)
		expect((await editFormOf({ id: 'c-1', isDraft: true })).props('allowDraft')).toBe(true)
		expect((await editFormOf({ id: 'c-1', isDraft: true }, { allowDraft: false })).props('allowDraft')).toBe(false)
	})
})

describe('CnIndexPage: form drafts', () => {
	function indexPage() {
		return shallowMount(CnIndexPage, {
			props: { title: 'Cases', schema: SCHEMA, objects: [], draftAppId: 'dossiq', allowDraft: true },
			global: { mocks: MOCKS },
		})
	}

	it('offers Save draft on the create form and forwards the app key', async () => {
		const wrapper = indexPage()
		await wrapper.setData({ showFormDialogVisible: true, editItem: null })
		await flushPromises()
		const dialog = wrapper.findComponent({ ref: 'formDialog' })
		expect(dialog.exists()).toBe(true)
		expect(dialog.props('draftAppId')).toBe('dossiq')
		expect(dialog.props('allowDraft')).toBe(true)
	})

	it('does not offer Save draft when editing a record that is in use', async () => {
		const wrapper = indexPage()
		await wrapper.setData({ showFormDialogVisible: true, editItem: { id: 'c-1', isDraft: false } })
		await flushPromises()
		expect(wrapper.findComponent({ ref: 'formDialog' }).props('allowDraft')).toBe(false)
	})
})
