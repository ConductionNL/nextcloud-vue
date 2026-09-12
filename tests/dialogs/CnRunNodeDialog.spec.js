/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Tests for CnRunNodeDialog — the generic field renderer `run-node`
 * (manifest-run-node-action) opens for a node's declared `configForm()`.
 * The dialog performs no HTTP itself except the `optionsFrom` fetch for a
 * select field; the actual run POST is CnActionButtons'/postRunNode's job
 * (covered in CnActionButtons.spec.js and actionsDispatcherW3.spec.js).
 */

import { mount } from '@vue/test-utils'
import axios from '@nextcloud/axios'
import CnRunNodeDialog from '../../src/dialogs/CnRunNodeDialog.vue'

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({
	__esModule: true,
	generateUrl: jest.fn((p) => `/nc${p}`),
}))

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('CnRunNodeDialog', () => {
	beforeEach(() => {
		axios.get.mockReset()
		axios.get.mockResolvedValue({ data: { results: [] } })
	})

	it('renders one field per declared entry, keyed by data-cn-field', () => {
		const fields = [
			{ key: 'title', label: 'Title', type: 'text' },
			{ key: 'notes', label: 'Notes', type: 'textarea' },
			{ key: 'count', label: 'Count', type: 'number' },
			{ key: 'urgent', label: 'Urgent', type: 'boolean' },
		]
		const wrapper = mount(CnRunNodeDialog, { propsData: { fields } })

		for (const field of fields) {
			expect(wrapper.find(`[data-cn-field="${field.key}"]`).exists()).toBe(true)
		}
	})

	it('shows the "no options" hint for an empty form', () => {
		const wrapper = mount(CnRunNodeDialog, { propsData: { fields: [] } })
		expect(wrapper.text()).toContain('This step has no options.')
	})

	it('seeds boolean fields to false and everything else to empty string', () => {
		const wrapper = mount(CnRunNodeDialog, {
			propsData: {
				fields: [
					{ key: 'urgent', label: 'Urgent', type: 'boolean' },
					{ key: 'title', label: 'Title', type: 'text' },
				],
			},
		})
		expect(wrapper.vm.values).toEqual({ urgent: false, title: '' })
	})

	it('fetches optionsFrom for a select field and normalises {results: [...]} rows', async () => {
		axios.get.mockResolvedValue({
			data: { results: [{ id: 'a1', label: 'Alpha' }, { uuid: 'b2', name: 'Beta' }] },
		})
		const wrapper = mount(CnRunNodeDialog, {
			propsData: {
				fields: [{ key: 'templateSlug', label: 'Template', type: 'select', optionsFrom: '/apps/dossiq/api/templates' }],
			},
		})
		await flush()

		// A path already starting with /apps is used as-is (matching
		// CnFlowNodeEditModal's own optionsFrom convention) — only a
		// BARE path (no /apps, no /index.php prefix) goes through
		// generateUrl().
		expect(axios.get).toHaveBeenCalledWith('/apps/dossiq/api/templates')
		expect(wrapper.vm.optionsFor({ key: 'templateSlug' })).toEqual([
			{ id: 'a1', label: 'Alpha' },
			{ id: 'b2', label: 'Beta' },
		])
	})

	it('disables Run while a required field is empty, enables it once filled', async () => {
		const wrapper = mount(CnRunNodeDialog, {
			propsData: { fields: [{ key: 'templateSlug', label: 'Template', type: 'text', required: true }] },
		})
		expect(wrapper.vm.requiredFieldsFilled).toBe(false)

		wrapper.vm.setValue('templateSlug', 'welcome')
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.requiredFieldsFilled).toBe(true)
	})

	it('an optional field never blocks requiredFieldsFilled', () => {
		const wrapper = mount(CnRunNodeDialog, {
			propsData: { fields: [{ key: 'notes', label: 'Notes', type: 'textarea' }] },
		})
		expect(wrapper.vm.requiredFieldsFilled).toBe(true)
	})

	it('emits confirm with the collected values', () => {
		const wrapper = mount(CnRunNodeDialog, {
			propsData: { fields: [{ key: 'title', label: 'Title', type: 'text' }] },
		})
		wrapper.vm.setValue('title', 'Hello')
		wrapper.vm.$emit('confirm', wrapper.vm.values)
		expect(wrapper.emitted('confirm')[0][0]).toEqual({ title: 'Hello' })
	})

	it('coerces a number field through setNumberValue, keeping an empty string empty (not 0)', () => {
		const wrapper = mount(CnRunNodeDialog, {
			propsData: { fields: [{ key: 'count', label: 'Count', type: 'number', required: true }] },
		})
		wrapper.vm.setNumberValue('count', '5')
		expect(wrapper.vm.values.count).toBe(5)
		expect(wrapper.vm.requiredFieldsFilled).toBe(true)

		wrapper.vm.setNumberValue('count', '')
		expect(wrapper.vm.values.count).toBe('')
		expect(wrapper.vm.requiredFieldsFilled).toBe(false)
	})

	it('translates label/title through the injected translate function', () => {
		const translate = jest.fn((key) => `NL:${key}`)
		const wrapper = mount(CnRunNodeDialog, {
			propsData: { title: 'Generate document', fields: [], translate },
		})
		expect(wrapper.vm.tr('Generate document')).toBe('NL:Generate document')
	})
})
