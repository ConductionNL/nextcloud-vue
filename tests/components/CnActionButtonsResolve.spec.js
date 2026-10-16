/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A header action with a `resolve` block is disabled with its reason, or
 * hidden, while no record matches; a navigate action links to the record.
 *
 * @spec openspec/changes/screens-action-resolve/specs/manifest-actions/spec.md#requirement-an-action-can-name-a-looked-up-record
 */
jest.mock('../../src/utils/actionResolve.js', () => ({
	...jest.requireActual('../../src/utils/actionResolve.js'),
	resolveActionRecord: jest.fn(),
}))
jest.mock('@nextcloud/dialogs', () => ({ __esModule: true, showSuccess: jest.fn(), showError: jest.fn() }))
jest.mock('@nextcloud/event-bus', () => ({ __esModule: true, emit: jest.fn(), subscribe: jest.fn(), unsubscribe: jest.fn() }))

const { mount } = require('@vue/test-utils')
const CnActionButtons = require('../../src/components/CnActionButtons/CnActionButtons.vue').default
const { resolveActionRecord } = require('../../src/utils/actionResolve.js')

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

const stubs = {
	NcButton: {
		name: 'NcButton',
		props: ['disabled', 'variant', 'href', 'target'],
		emits: ['click'],
		template: '<component :is="href ? \'a\' : \'button\'" :disabled="disabled" :href="href" v-bind="$attrs" @click="$emit(\'click\', $event)"><slot /></component>',
	},
	CnIcon: true,
	CnConfirmDialog: true,
	CnFormDialog: true,
	CnAdvancedFormDialog: true,
	CnRunNodeDialog: true,
}

const resolve = { register: 'pipelinq', schema: 'cycle', filter: { programme: '@objectId', status: 'open' }, reason: 'No open cycle' }
const router = { resolve: (to) => ({ href: '/apps/pipelinq' + (typeof to === 'string' ? to : to.path) }), push: jest.fn(() => Promise.resolve()) }

async function mountButtons(actions) {
	const wrapper = mount(CnActionButtons, {
		propsData: { actions, router },
		provide: { cnTranslate: (s) => (s === 'No open cycle' ? 'Geen open cyclus' : s) },
		stubs,
	})
	await flush()
	await flush()
	return wrapper
}

describe('CnActionButtons with resolve', () => {
	beforeEach(() => resolveActionRecord.mockReset())

	it('disables an action with its reason while no record matches', async () => {
		resolveActionRecord.mockResolvedValue(null)
		const wrapper = await mountButtons([{ id: 'close', label: 'Close cycle', type: 'api-call', url: '/x/@resolved.id', resolve }])
		const button = wrapper.find('[data-testid="cn-action-close"]')
		expect(button.attributes('disabled')).toBeDefined()
		expect(button.attributes('title')).toBe('Geen open cyclus')
	})

	it('hides it with unresolved hide', async () => {
		resolveActionRecord.mockResolvedValue(null)
		const wrapper = await mountButtons([{ id: 'close', label: 'Close cycle', type: 'api-call', url: '/x', resolve: { ...resolve, unresolved: 'hide' } }])
		expect(wrapper.find('[data-testid="cn-action-close"]').exists()).toBe(false)
	})

	it('enables it when a record matches, and links a navigate action to the record', async () => {
		resolveActionRecord.mockResolvedValue({ id: 'c-7' })
		const wrapper = await mountButtons([
			{ id: 'close', label: 'Close cycle', type: 'api-call', url: '/x/@resolved.id', resolve },
			{ id: 'open', label: 'Open cycle', type: 'navigate', target: '/cycles/@resolved.id', resolve },
		])
		expect(wrapper.find('[data-testid="cn-action-close"]').attributes('disabled')).toBeUndefined()
		expect(wrapper.find('[data-testid="cn-action-open"]').attributes('href')).toBe('/apps/pipelinq/cycles/c-7')
	})
})
