/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A banner action can run a declared OpenRegister action on the page's record
 * (`declaredAction`). It shows only while the record's `@self.can` grants that
 * action, and a banner whose every action is such an action stays hidden while
 * none is granted: "Add yourself as handler" on a case the reader may read but
 * not change.
 *
 * @spec openspec/changes/detail-page-record-rights/specs/detail-page-record-rights/spec.md#requirement-a-banner-action-can-run-a-declared-action-on-the-record
 */
import { mount } from '@vue/test-utils'
import CnBannerWidget from '../../src/components/CnBannerWidget/CnBannerWidget.vue'

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

const CONTENT = {
	layout: 'attention',
	variant: 'info',
	title: 'Add yourself as handler to be able to edit',
	visibleWhen: { field: '@self.can.update', op: 'eq', value: false },
	actions: [
		{ label: 'Add yourself as handler', declaredAction: 'claim-as-handler', successMessage: 'You are now the handler' },
	],
}

/**
 * @param {object|undefined} can The record's `@self.can`.
 * @param {Function} dispatch The page's dispatcher.
 * @return {Promise<object>} The banner once its condition resolved.
 */
async function mountBanner(can, dispatch = jest.fn()) {
	const self = { id: 'c-1', register: '7', schema: '42' }
	if (can !== undefined) {
		self.can = can
	}
	const wrapper = mount(CnBannerWidget, {
		props: { content: CONTENT, objectData: { id: 'c-1', '@self': self } },
		global: {
			provide: { cnDispatchAction: dispatch },
			stubs: { NcNoteCard: { template: '<div class="note"><slot /></div>' } },
		},
	})
	await flush()
	await flush()
	return wrapper
}

describe('CnBannerWidget — a declared action on the record', () => {
	it('🔴 shows the banner and its button while update is refused and the action is granted', async () => {
		const wrapper = await mountBanner({ update: false, 'claim-as-handler': true })
		expect(wrapper.find('[data-testid="cn-banner-widget-attention"]').exists()).toBe(true)
		const buttons = wrapper.findAll('[data-testid="cn-banner-widget-action"]')
		expect(buttons.map((button) => button.text())).toEqual(['Add yourself as handler'])
	})

	it('🔴 runs the declared action on the record and refreshes the page', async () => {
		const dispatch = jest.fn()
		const wrapper = await mountBanner({ update: false, 'claim-as-handler': true }, dispatch)
		await wrapper.find('[data-testid="cn-banner-widget-action"]').trigger('click')
		expect(dispatch).toHaveBeenCalledTimes(1)
		expect(dispatch.mock.calls[0][0]).toMatchObject({
			type: 'api-call',
			method: 'POST',
			url: '/apps/openregister/api/objects/7/42/c-1/actions/claim-as-handler',
			refresh: true,
			successMessage: 'You are now the handler',
		})
	})

	it('addresses the page\'s register and schema when the detail page names them', async () => {
		const dispatch = jest.fn()
		const record = { id: 'c-1', '@self': { id: 'c-1', register: '7', schema: '42', can: { update: false, 'claim-as-handler': true } } }
		const wrapper = mount(CnBannerWidget, {
			props: { content: CONTENT },
			global: {
				provide: { cnDispatchAction: dispatch, cnObjectContext: { value: { objectId: 'c-1', object: record, register: 'dossiq', schema: 'case' } } },
				stubs: { NcNoteCard: { template: '<div class="note"><slot /></div>' } },
			},
		})
		await flush()
		await flush()
		await wrapper.find('[data-testid="cn-banner-widget-action"]').trigger('click')
		expect(dispatch.mock.calls[0][0].url).toBe('/apps/openregister/api/objects/dossiq/case/c-1/actions/claim-as-handler')
	})

	it('stays hidden while the record does not grant the action', async () => {
		const wrapper = await mountBanner({ update: false })
		expect(wrapper.find('[data-testid="cn-banner-widget-attention"]').exists()).toBe(false)
	})

	it('stays hidden for a record without can', async () => {
		const wrapper = await mountBanner(undefined)
		expect(wrapper.find('[data-testid="cn-banner-widget-attention"]').exists()).toBe(false)
	})

	it('stays hidden while the reader may update the record', async () => {
		const wrapper = await mountBanner({ update: true, 'claim-as-handler': true })
		expect(wrapper.find('[data-testid="cn-banner-widget-attention"]').exists()).toBe(false)
	})
})
