/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `content.confirmCreate`: a create whose values match asks first, posts only
 * on yes, and a no returns to the form without an error.
 */
import { flushPromises, shallowMount } from '@vue/test-utils'
import { ref } from 'vue'

const mockGet = jest.fn()
const mockPost = jest.fn()
const mockShowConfirmation = jest.fn()
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: (...a) => mockGet(...a), post: (...a) => mockPost(...a) } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (u, p) => u.replace('{register}', p?.register).replace('{schema}', p?.schema) }))
jest.mock('@nextcloud/dialogs', () => ({ showConfirmation: (...a) => mockShowConfirmation(...a) }))

const CnObjectListWidget = require('../../src/components/CnObjectListWidget/CnObjectListWidget.vue').default

const NL = { 'Anyone can read this document. Publish it?': 'Iedereen kan dit document lezen. Publiceren?', 'Publish publicly': 'Openbaar publiceren' }

/**
 * Mount the list with a fake create dialog.
 *
 * @param {object} content Extra content.
 * @return {{ wrapper: object, dialog: object, create: Function }} The wrapper, the dialog double and a create through it.
 */
function mountList(content) {
	const wrapper = shallowMount(CnObjectListWidget, {
		props: {
			content: {
				register: 'r',
				schema: 'complianceDocument',
				addLabel: 'Publish a compliance document',
				confirmCreate: [{ when: { field: 'audience', op: 'eq', value: 'public' }, text: 'Anyone can read this document. Publish it?', confirmLabel: 'Publish publicly' }],
				...content,
			},
		},
		global: {
			provide: { cnObjectContext: ref({ objectId: 'm-1', object: { id: 'm-1' } }), cnTranslate: (key) => NL[key] ?? key },
			stubs: { CnDataTable: true, CnFormDialog: true, CnPagination: true, CnWidgetEmptyState: true },
		},
	})
	const dialog = { setResult: jest.fn(), setValidationErrors: jest.fn() }
	const refs = { createDialog: dialog }
	const vm = new Proxy(wrapper.vm, { get: (target, key) => (key === '$refs' ? refs : target[key]) })
	const create = (values) => CnObjectListWidget.methods.onCreateConfirm.call(vm, values)
	return { wrapper, dialog, create }
}

describe('CnObjectListWidget — content.confirmCreate', () => {
	beforeEach(() => {
		jest.clearAllMocks()
		mockGet.mockResolvedValue({ data: { results: [], total: 0 } })
		mockPost.mockResolvedValue({ data: { id: 'doc-1' } })
	})

	it('asks before a matching create, in the host language, and posts on yes', async () => {
		mockShowConfirmation.mockResolvedValue(true)
		const { dialog, create } = mountList({})
		await flushPromises()
		await create({ title: 'DPA', audience: 'public' })
		expect(mockShowConfirmation).toHaveBeenCalledWith(expect.objectContaining({
			name: 'Publish a compliance document',
			text: 'Iedereen kan dit document lezen. Publiceren?',
			labelConfirm: 'Openbaar publiceren',
		}))
		expect(mockPost).toHaveBeenCalledWith('/apps/openregister/api/objects/r/complianceDocument', { title: 'DPA', audience: 'public' })
		expect(dialog.setResult).toHaveBeenCalledWith({ success: true })
	})

	it('posts nothing on no and returns to the form without an error', async () => {
		mockShowConfirmation.mockResolvedValue(false)
		const { dialog, create } = mountList({})
		await flushPromises()
		await create({ title: 'Pentest', audience: 'public' })
		expect(mockPost).not.toHaveBeenCalled()
		expect(dialog.setResult).not.toHaveBeenCalled()
		expect(dialog.setValidationErrors).toHaveBeenCalledWith({}, null)
	})

	it('treats a dialog that fails to open as a no', async () => {
		mockShowConfirmation.mockRejectedValue(new Error('closed'))
		const { create } = mountList({})
		await flushPromises()
		await create({ audience: 'public' })
		expect(mockPost).not.toHaveBeenCalled()
	})

	it('does not ask when the values do not match, or when nothing is declared', async () => {
		const { create } = mountList({})
		await flushPromises()
		await create({ title: 'DPA', audience: 'named' })
		const plain = mountList({ confirmCreate: undefined })
		await flushPromises()
		await plain.create({ title: 'DPA', audience: 'public' })
		expect(mockShowConfirmation).not.toHaveBeenCalled()
		expect(mockPost).toHaveBeenCalledTimes(2)
	})
})
