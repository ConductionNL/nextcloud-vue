/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A create form can start from a saved record template (`templateSource`,
 * OpenRegister's `/api/record-templates`), leaving out and naming the values
 * that no longer fit (openregister records-saved-templates 2.3).
 *
 * @spec openspec/changes/form-start-from-template/specs/form-dialog/spec.md
 */
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: (p) => p }))

import axios from '@nextcloud/axios'
import { flushPromises, shallowMount } from '@vue/test-utils'
import CnFormDialog from '../../src/components/CnFormDialog/CnFormDialog.vue'
import { validateManifestV2 } from '../../src/utils/validateManifest.js'

const SCHEMA = {
	type: 'object',
	properties: {
		title: { type: 'string', title: 'Title' },
		capacity: { type: 'integer', title: 'Capacity' },
		tags: { type: 'array', title: 'Tags', items: { type: 'string' } },
	},
}
const TEMPLATE = { id: 't1', name: 'Workshop', values: { title: 'Workshop', capacity: 'twenty', tags: ['a'], room: 'B12' } }
const mountForm = (props = {}) => shallowMount(CnFormDialog, { propsData: { schema: SCHEMA, item: null, templateSource: { register: 'events', schema: 'event' }, ...props }, stubs: { NcDialog: { template: '<div><slot /></div>' } } })

describe('CnFormDialog record templates', () => {
	beforeEach(() => {
		axios.get.mockReset()
		axios.get.mockResolvedValue({ data: { results: [TEMPLATE, { id: 'bad' }] } })
	})

	it('reads the templates of the register and schema and offers the usable ones', async () => {
		const w = mountForm()
		await flushPromises()
		expect(axios.get).toHaveBeenCalledWith('/apps/openregister/api/record-templates', { params: { register: 'events', schema: 'event' } })
		expect(w.vm.recordTemplates.map((t) => t.id)).toEqual(['t1'])
		expect(w.find('[data-testid="cn-form-dialog-templates"]').exists()).toBe(true)
	})

	it('fills the fitting values, names the ones left out and keeps what was typed', async () => {
		const w = mountForm()
		await flushPromises()
		w.vm.updateField('tags', ['mine'])
		w.vm.applyRecordTemplate(TEMPLATE)
		expect(w.vm.formData.title).toBe('Workshop')
		expect(w.vm.formData.tags).toEqual(['mine'])
		expect(w.vm.formData.capacity).not.toBe('twenty')
		expect(w.vm.templateDropped).toEqual(['Capacity', 'room'])
	})

	it('offers nothing on an edit form or without a source', async () => {
		mountForm({ item: { id: 'e1', title: 'x' } })
		mountForm({ templateSource: null })
		await flushPromises()
		expect(axios.get).not.toHaveBeenCalled()
	})

	it('is switched on from the manifest', () => {
		const manifest = { $schema: 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json', version: '1.0.0', menu: [], pages: [{ id: 'Events', route: '/events', type: 'index', title: 'Events', config: { register: 'events', schema: 'event', recordTemplates: true } }] }
		expect(validateManifestV2(manifest).errors).toEqual([])
	})
})
