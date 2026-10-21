/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * A reports page header button naming a header action with `href` is a real
 * link: it runs no handler and emits no `header-action` (nextcloud-vue#1314).
 */

import { mount } from '@vue/test-utils'
import CnReportsPage from '../../src/components/CnReportsPage/CnReportsPage.vue'

jest.mock('@nextcloud/router', () => ({
	__esModule: true,
	generateUrl: jest.fn((p) => `/nc/index.php${p}`),
	getRootUrl: jest.fn(() => '/nc'),
}))

describe('CnReportsPage: a header button naming an href action', () => {
	it('renders an anchor with the resolved href, while a handler button still runs and emits', async () => {
		const download = jest.fn()
		const wrapper = mount(CnReportsPage, {
			props: {
				title: 'Reports',
				cards: [{ id: 'v', label: 'Votes', route: 'Votes' }],
				headerButtons: [
					{ label: 'Archive', action: 'archive' },
					{ label: 'Download', action: 'download' },
				],
				headerActions: [
					{ id: 'archive', label: 'Archive', href: '/apps/docudesk/archive', target: '_blank' },
					{ id: 'download', label: 'Download', handler: 'download' },
				],
			},
			global: {
				provide: { cnLook: 'nextcloud', cnRegistry: { download } },
				mocks: { $router: { push: jest.fn(), resolve: ({ name }) => ({ href: `/r/${name}` }) } },
				stubs: {
					CnIcon: true,
					CnBuildiqEditButton: true,
					NcButton: { props: ['href', 'target', 'variant'], emits: ['click'], template: '<component :is="href ? \'a\' : \'button\'" :href="href" :target="target" v-bind="$attrs" @click="$emit(\'click\', $event)"><slot /></component>' },
				},
			},
		})
		const link = wrapper.find('[data-testid="cn-reports-header-button-archive"]')
		expect(link.element.tagName).toBe('A')
		expect(link.attributes('href')).toBe('/nc/index.php/apps/docudesk/archive')
		expect(link.attributes('target')).toBe('_blank')
		await link.trigger('click')
		expect(wrapper.emitted('header-action')).toBeFalsy()

		const button = wrapper.find('[data-testid="cn-reports-header-button-download"]')
		expect(button.element.tagName).toBe('BUTTON')
		await button.trigger('click')
		expect(download).toHaveBeenCalledWith({ actionId: 'download' })
		expect(wrapper.emitted('header-action')).toEqual([[{ action: 'download', id: 'download' }]])
	})

	it('makes a button naming a function-handler entry with href a link that does not run it', async () => {
		const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
		const run = jest.fn()
		const wrapper = mount(CnReportsPage, {
			props: {
				title: 'Reports',
				cards: [{ id: 'v', label: 'Votes', route: 'Votes' }],
				headerButtons: [{ label: 'Run', action: 'run' }],
				headerActions: [{ id: 'run', label: 'Run', href: '/apps/x', handler: run }],
			},
			global: {
				provide: { cnLook: 'nextcloud' },
				mocks: { $router: { push: jest.fn(), resolve: ({ name }) => ({ href: `/r/${name}` }) } },
				stubs: {
					CnIcon: true,
					CnBuildiqEditButton: true,
					NcButton: { props: ['href', 'target', 'variant'], emits: ['click'], template: '<component :is="href ? \'a\' : \'button\'" :href="href" :target="target" v-bind="$attrs" @click="$emit(\'click\', $event)"><slot /></component>' },
				},
			},
		})
		const button = wrapper.find('[data-testid="cn-reports-header-button-run"]')
		expect(button.element.tagName).toBe('A')
		expect(button.attributes('href')).toBe('/nc/index.php/apps/x')
		await button.trigger('click')
		expect(run).not.toHaveBeenCalled()
		expect(wrapper.emitted('header-action')).toBeFalsy()
		warn.mockRestore()
	})
})
