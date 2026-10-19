/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * A dashboard header action with `href` reaches CnActionButtons in its link
 * form and renders as an anchor button that is never dispatched
 * (nextcloud-vue#1314).
 */

import { mount } from '@vue/test-utils'
import CnActionButtons from '../../src/components/CnActionButtons/CnActionButtons.vue'
import CnDashboardPage from '../../src/components/CnDashboardPage/CnDashboardPage.vue'

jest.mock('@nextcloud/router', () => ({
	__esModule: true,
	generateUrl: jest.fn((p) => `/nc/index.php${p}`),
	getRootUrl: jest.fn(() => '/nc'),
	generateOcsUrl: jest.fn((p) => `/nc/ocs/v2.php${p}`),
	imagePath: jest.fn((app, file) => `/nc/${app}/img/${file}`),
}))

const HEADER_ACTIONS = [
	{ id: 'connections', label: 'Add integration', href: '/apps/integriq/connections', handler: 'openConnections' },
	{ id: 'docs', label: 'Docs', href: 'https://example.org/docs', target: '_blank' },
	{ id: 'new-lead', label: 'New lead', type: 'open-form', schema: 'lead' },
]

describe('CnDashboardPage: a header action with href', () => {
	it('renders an anchor with the resolved href and does not dispatch it', async () => {
		const wrapper = mount(CnDashboardPage, {
			propsData: { title: 'Dash', headerActions: HEADER_ACTIONS },
			global: {
				stubs: {
					CnDashboardGrid: true,
					CnBuildiqEditButton: true,
					NcButton: { props: ['href', 'target', 'variant', 'disabled'], emits: ['click'], template: '<component :is="href ? \'a\' : \'button\'" :href="href" :target="target" v-bind="$attrs" @click="$emit(\'click\', $event)"><slot /></component>' },
				},
			},
		})
		const buttons = wrapper.findComponent(CnActionButtons)
		expect(buttons.props('actions')[0]).toEqual({ id: 'connections', label: 'Add integration', href: '/nc/index.php/apps/integriq/connections', target: '_self' })
		const dispatch = jest.spyOn(buttons.vm, 'onActionClick').mockImplementation(() => {})

		const link = wrapper.find('[data-testid="cn-action-connections"]')
		expect(link.element.tagName).toBe('A')
		expect(link.attributes('href')).toBe('/nc/index.php/apps/integriq/connections')
		expect(link.attributes('target')).toBe('_self')
		expect(wrapper.find('[data-testid="cn-action-docs"]').attributes('target')).toBe('_blank')
		await link.trigger('click')
		expect(dispatch).not.toHaveBeenCalled()

		expect(wrapper.find('[data-testid="cn-action-new-lead"]').element.tagName).toBe('BUTTON')
	})
})
