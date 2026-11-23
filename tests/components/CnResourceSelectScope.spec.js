/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnResourceSelect `scope`: a vocabulary scoped to an owner plus the rows
 * every owner shares (dossiq's RoleTypePicker: the case type's own role types
 * first, then the generic ones, a generic one dropped when the type already
 * claims its key). A failed read says so instead of drawing an empty picker.
 *
 * @spec openspec/changes/dq-abstract-forms/specs/form-widgets/spec.md
 */
import axios from '@nextcloud/axios'
import { flushPromises, shallowMount } from '@vue/test-utils'
import CnResourceSelect from '../../src/components/CnResourceSelect/CnResourceSelect.vue'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: (p) => `/nc${p}` }))

const ROWS = [
	{ id: 'g-gem', name: 'Gemachtigde', genericRole: 'gemachtigde' },
	{ id: 'ct2-own', name: 'Inspector', caseType: 'ct-2' },
	{ id: 'ct1-own', name: 'Handler', caseType: 'ct-1' },
	{ id: 'ct1-gem', name: 'Gemachtigde (bezwaar)', caseType: { id: 'ct-1' }, genericRole: 'gemachtigde' },
	{ id: 'g-adv', name: 'Adviseur', genericRole: 'adviseur' },
]

const SCOPE = { field: 'caseType', value: 'ct-1', includeUnscoped: true, dedupeOn: 'genericRole' }

/**
 * @param {object} props Props.
 * @return {Promise<import('@vue/test-utils').VueWrapper>} The select.
 */
async function mountSelect(props = {}) {
	const wrapper = shallowMount(CnResourceSelect, { props: { register: 'dossiq', schema: 'roleType', inputLabel: 'Role', scope: SCOPE, allowCreate: false, ...props } })
	await flushPromises()
	return wrapper
}

beforeEach(() => {
	axios.get.mockReset()
	axios.get.mockResolvedValue({ data: { results: ROWS } })
})

describe('CnResourceSelect scope', () => {
	it('reads the whole vocabulary once', async () => {
		await mountSelect()

		expect(axios.get).toHaveBeenCalledWith('/nc/apps/openregister/api/objects/dossiq/roleType', { params: { _limit: 200 } })
	})

	it("offers the owner's own rows first, then the shared ones, a claimed key skipped", async () => {
		const wrapper = await mountSelect()

		expect(wrapper.vm.displayOptions.map((o) => o.value)).toEqual(['ct1-own', 'ct1-gem', 'g-adv'])
	})

	it('leaves the shared rows out without includeUnscoped', async () => {
		const wrapper = await mountSelect({ scope: { ...SCOPE, includeUnscoped: false } })

		expect(wrapper.vm.displayOptions.map((o) => o.value)).toEqual(['ct1-own', 'ct1-gem'])
	})

	it('offers every row when the owner is not known, rather than none', async () => {
		const wrapper = await mountSelect({ scope: { ...SCOPE, value: '' } })

		expect(wrapper.vm.displayOptions).toHaveLength(5)
	})

	it('shows the value the form already holds and emits the picked id', async () => {
		const wrapper = await mountSelect({ modelValue: 'ct1-own' })
		const select = wrapper.findComponent({ name: 'NcSelect' })

		expect(wrapper.vm.selectedOption.label).toBe('Handler')
		select.vm.$emit('update:modelValue', { value: 'g-adv', label: 'Adviseur' })
		expect(wrapper.emitted('update:modelValue')).toEqual([['g-adv']])
	})

	it('says a failed read instead of drawing an empty picker', async () => {
		axios.get.mockRejectedValue(new Error('down'))
		const wrapper = await mountSelect({ failedText: 'The roles this case takes could not be read.' })

		expect(wrapper.find('[data-testid="cn-resource-select-failed"]').text()).toBe('The roles this case takes could not be read.')
		expect(wrapper.findComponent({ name: 'NcSelect' }).exists()).toBe(false)
	})

	it('reads again when the scope moves', async () => {
		const wrapper = await mountSelect()
		await wrapper.setProps({ scope: { ...SCOPE, value: 'ct-2' } })
		await flushPromises()

		expect(axios.get).toHaveBeenCalledTimes(2)
		expect(wrapper.vm.displayOptions.map((o) => o.value)).toEqual(['ct2-own', 'g-gem', 'g-adv'])
	})
})
