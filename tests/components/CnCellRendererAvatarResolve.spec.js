/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * The avatar cell of a REFERENCED person (`widgetProps.resolve`): the cell
 * holds a uuid, the name is resolved through the object store and drawn with
 * its initials (screens-avatar-cell-resolve).
 *
 * @spec openspec/changes/screens-avatar-cell-resolve/specs/data-table/spec.md
 */

import { mount } from '@vue/test-utils'

jest.mock('../../src/store/useObjectStore.js', () => ({
	useObjectStore: jest.fn(),
}))

const { useObjectStore } = require('../../src/store/useObjectStore.js')
const CnCellRenderer = require('../../src/components/CnCellRenderer/CnCellRenderer.vue').default
const CnFkResolveCell = require('../../src/components/CnFkResolveCell/CnFkResolveCell.vue').default

function makeStore(objects = {}, fetched = null) {
	return {
		objects,
		objectTypeRegistry: {},
		registerObjectType: jest.fn(function(slug, schemaId, registerId) {
			this.objectTypeRegistry[slug] = { schema: schemaId, register: registerId }
		}),
		fetchObject: jest.fn().mockResolvedValue(fetched),
	}
}

const resolve = { register: 'decidiq', schema: 'participant', labelField: 'fullName' }

async function flush() {
	await new Promise((r) => setTimeout(r))
}

function mountCell(value, widgetProps = { resolve }) {
	return mount(CnCellRenderer, { propsData: { value, widget: 'avatar', widgetProps, row: { chair: value } } })
}

beforeEach(() => {
	useObjectStore.mockReset()
})

describe('avatar cell with resolve', () => {
	it('draws the initials and the resolved name of the referenced object', async () => {
		const store = makeStore({}, { fullName: 'Anna de Vries' })
		useObjectStore.mockReturnValue(store)
		const wrapper = mountCell('p-1')
		await flush()
		const cell = wrapper.find('[data-testid="cn-cell-avatar-resolved"]')
		expect(cell.exists()).toBe(true)
		expect(cell.find('.cn-cell-renderer__avatar-initials').text()).toBe('AV')
		expect(cell.find('.cn-cell-renderer__avatar-name').text()).toBe('Anna de Vries')
		expect(store.fetchObject).toHaveBeenCalledWith(expect.any(String), 'p-1')
	})

	it('shows the id without initials when the reference cannot be resolved', async () => {
		useObjectStore.mockReturnValue(makeStore({}, null))
		const wrapper = mountCell('p-2')
		await flush()
		expect(wrapper.find('.cn-cell-renderer__avatar-name').text()).toBe('p-2')
		expect(wrapper.find('.cn-cell-renderer__avatar-initials').text()).toBe('')
	})

	it('draws a dash for an empty cell', () => {
		useObjectStore.mockReturnValue(makeStore())
		const wrapper = mountCell(null)
		expect(wrapper.find('.cn-cell-renderer__dash').exists()).toBe(true)
		expect(wrapper.findComponent(CnFkResolveCell).exists()).toBe(false)
	})

	it('keeps the avatar cell as it was without resolve', () => {
		useObjectStore.mockReturnValue(makeStore())
		const wrapper = mountCell('Jan Jansen', {})
		expect(wrapper.findComponent(CnFkResolveCell).exists()).toBe(false)
		expect(wrapper.find('.cn-cell-renderer__avatar-initials').text()).toBe('JJ')
		expect(wrapper.find('.cn-cell-renderer__avatar-name').text()).toBe('Jan Jansen')
	})
})
