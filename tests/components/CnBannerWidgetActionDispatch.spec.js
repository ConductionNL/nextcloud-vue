/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A banner action can be a manifest action (`type`: `open-modal`, `handler`,
 * ...), dispatched through the page with `@subject.<path>` tokens filled from
 * the banner's subject (DqMijnWerk "Vandaag eerst": Termijn opschorten opens
 * the lifecycle dialog on the case the card names).
 *
 * @spec openspec/changes/banner-action-dispatch/specs/banner-action-dispatch/spec.md
 */
import { mount } from '@vue/test-utils'
import CnBannerWidget from '../../src/components/CnBannerWidget/CnBannerWidget.vue'

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

const CONTENT = {
	layout: 'attention',
	variant: 'error',
	title: '{subject.title}',
	visibleWhen: { field: 'id', op: 'notEmpty' },
	actions: [
		{ label: 'Suspend the term', type: 'open-modal', target: 'CaseLifecycleMenuDialog', props: { caseId: '@subject.id', act: 'suspend' } },
		{ label: 'Open case', primary: true, href: '/apps/x/cases/c-1' },
	],
}

/**
 * @param {Function|null} dispatch The page's dispatcher, or null.
 * @return {Promise<object>} The banner once its condition resolved.
 */
async function mountBanner(dispatch) {
	const wrapper = mount(CnBannerWidget, {
		props: { content: CONTENT, objectData: { id: 'c-1', title: 'Parkeervergunningen binnenstad' } },
		global: {
			provide: dispatch ? { cnDispatchAction: dispatch } : {},
			stubs: { NcNoteCard: { template: '<div class="note"><slot /></div>' } },
		},
	})
	await flush()
	await flush()
	return wrapper
}

describe('CnBannerWidget — a manifest action on the subject', () => {
	it('dispatches the action through the page with the subject filled in', async () => {
		const dispatch = jest.fn()
		const wrapper = await mountBanner(dispatch)
		const buttons = wrapper.findAll('[data-testid="cn-banner-widget-action"]')
		expect(buttons.map((button) => button.text())).toEqual(['Suspend the term', 'Open case'])
		expect(buttons[0].element.tagName).toBe('BUTTON')
		await buttons[0].trigger('click')
		expect(dispatch).toHaveBeenCalledTimes(1)
		expect(dispatch.mock.calls[0][0]).toMatchObject({ type: 'open-modal', target: 'CaseLifecycleMenuDialog', props: { caseId: 'c-1', act: 'suspend' } })
		expect(wrapper.emitted('action')).toBeUndefined()
	})

	it('emits the action as before when no page dispatcher is there', async () => {
		const wrapper = await mountBanner(null)
		await wrapper.findAll('[data-testid="cn-banner-widget-action"]')[0].trigger('click')
		expect(wrapper.emitted('action')[0][0]).toMatchObject({ label: 'Suspend the term', index: 0 })
	})
})
