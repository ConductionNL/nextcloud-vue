/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A select input of CnTransitionInputFields reads its choices from an app
 * endpoint (`optionsEndpoint`), `@context.<path>` filled in its url and
 * params; without rows (a failed read) the input is hidden, as for optionsSource.
 *
 * @spec openspec/changes/transition-options-endpoint/specs/transition-inputs/spec.md#requirement-a-select-input-reads-its-choices-from-an-endpoint
 */
import axios from '@nextcloud/axios'
import { mount } from '@vue/test-utils'
import CnTransitionInputFields from '../../src/components/CnTransitionInputFields/CnTransitionInputFields.vue'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: (path) => `/nc${path}` }))

const stubs = {
	NcSelect: { name: 'NcSelect', props: ['modelValue', 'options', 'inputLabel', 'clearable', 'disabled'], template: '<div class="select" />' },
	NcNoteCard: { template: '<div><slot /></div>' },
}

/**
 * Let the reads settle.
 *
 * @return {Promise<void>}
 */
async function flush() {
	for (let i = 0; i < 6; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
	}
}

const INPUTS = [{
	field: 'substituteTeacherId',
	label: 'Substitute teacher',
	optionsEndpoint: { url: '/apps/school/api/sessions/@context.session.id/candidates', params: { at: '@context.session.startsAt' }, responsePath: 'candidates' },
	optionValue: 'userId',
	optionLabel: 'displayName',
}]

describe('CnTransitionInputFields optionsEndpoint', () => {
	beforeEach(() => axios.get.mockReset())

	it('reads the choices from the endpoint with the context filled in', async () => {
		axios.get.mockResolvedValue({ data: { candidates: [{ userId: 'eva', displayName: 'Eva' }, { userId: 'tom', displayName: 'Tom' }] } })
		const w = mount(CnTransitionInputFields, { props: { inputs: INPUTS, context: { session: { id: 's 1', startsAt: '2026-10-07T09:00' } } }, global: { stubs } })
		await flush()
		expect(axios.get).toHaveBeenCalledWith('/nc/apps/school/api/sessions/s%201/candidates', { params: { at: '2026-10-07T09:00' } })
		expect(w.findComponent({ name: 'NcSelect' }).props('options')).toEqual([{ value: 'eva', label: 'Eva' }, { value: 'tom', label: 'Tom' }])
	})

	it('asks nothing when the read fails', async () => {
		axios.get.mockRejectedValue(new Error('down'))
		const w = mount(CnTransitionInputFields, { props: { inputs: INPUTS, context: { session: { id: 's1' } } }, global: { stubs } })
		await flush()
		expect(w.findComponent({ name: 'NcSelect' }).exists()).toBe(false)
		expect(axios.get).toHaveBeenCalledTimes(1)
	})
})
