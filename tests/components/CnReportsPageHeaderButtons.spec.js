/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Header buttons on the reports page (board DcRapportages "Downloaden" and the
 * buildiq square): a button names a headerActions entry, which says what the
 * click does; every click emits header-action. Without buttons the header is
 * unchanged.
 *
 * @spec openspec/changes/screens-reports-header-buttons/specs/reports-page/spec.md#requirement-a-reports-page-carries-header-buttons
 */

import { mount } from '@vue/test-utils'
import CnReportsPage from '../../src/components/CnReportsPage/CnReportsPage.vue'

const CARDS = [{ id: 'v', label: 'Votes', route: 'Votes' }]

function mountPage({ look = 'nextcloud', props = {}, registry = {}, push = jest.fn() } = {}) {
	return mount(CnReportsPage, {
		props: { title: 'Reports', cards: CARDS, ...props },
		global: {
			provide: { cnLook: look, cnRegistry: registry, cnTranslate: (key) => `t:${key}` },
			mocks: { $router: { push, resolve: ({ name }) => ({ href: `/r/${name}` }) } },
			stubs: {
				CnIcon: { props: ['name'], template: '<i class="icon-stub" :data-name="name" />' },
				CnBuildiqEditButton: { template: '<span class="buildiq-stub" />' },
				NcButton: { props: ['variant'], emits: ['click'], template: '<button :data-variant="variant" @click="$emit(\'click\')"><slot name="icon" /><slot /></button>' },
			},
		},
	})
}

const order = (w) => w.findAll('[data-testid="cn-reports-header-buttons"] > *').map((el) => (el.classes('buildiq-stub') ? 'square' : el.text()))

describe('CnReportsPage: header buttons', () => {
	it('draws no button row and no square without headerButtons, in either look', () => {
		for (const look of ['nextcloud', 'board']) {
			const w = mountPage({ look })
			expect(w.find('[data-testid="cn-reports-header-buttons"]').exists()).toBe(false)
			expect(w.find('.buildiq-stub').exists()).toBe(false)
			expect(w.find('.cn-reports-page__header > h2').exists()).toBe(true)
		}
	})

	it('draws the declared buttons in order outside the board look, translated, with their icon, and drops a button without a label or action', () => {
		const w = mountPage({
			props: {
				headerButtons: [
					{ label: 'New', action: 'new', variant: 'primary' },
					{ label: 'Download', action: 'download', icon: 'Download' },
					{ action: 'nolabel' },
					{ label: 'No action' },
				],
			},
		})
		expect(order(w)).toEqual(['t:New', 't:Download'])
		expect(w.find('[data-testid="cn-reports-header-button-download"] .icon-stub').attributes('data-name')).toBe('Download')
		expect(w.find('[data-testid="cn-reports-header-button-new"]').attributes('data-variant')).toBe('primary')
	})

	it('orders secondary buttons, the buildiq square, then the primary under the board look', () => {
		const w = mountPage({
			look: 'board',
			props: { headerButtons: [{ label: 'New', action: 'new', variant: 'primary' }, { label: 'Download', action: 'download' }] },
		})
		expect(order(w)).toEqual(['t:Download', 'square', 't:New'])
	})

	it('reads the buttons from page.config too', () => {
		const w = mountPage({ props: { cards: null, page: { id: 'R', config: { cards: CARDS, headerButtons: [{ label: 'Download', action: 'download' }] } } } })
		expect(order(w)).toEqual(['t:Download'])
	})

	it('runs the named headerActions entry and emits header-action', async () => {
		const fn = jest.fn()
		const push = jest.fn()
		const registered = jest.fn()
		const w = mountPage({
			push,
			registry: { exportReports: { kind: 'handler', handler: registered } },
			props: {
				headerButtons: [
					{ label: 'Fn', action: 'fn' },
					{ label: 'Go', action: 'go' },
					{ label: 'Reg', action: 'reg' },
					{ label: 'Quiet', action: 'quiet' },
					{ label: 'Emit', action: 'unknown' },
				],
				headerActions: [
					{ id: 'fn', label: 'Fn', handler: fn },
					{ id: 'go', label: 'Go', handler: 'navigate', route: 'Export', params: { kind: 'all' } },
					{ id: 'reg', label: 'Reg', handler: 'exportReports' },
					{ id: 'quiet', label: 'Quiet', handler: 'none' },
				],
			},
		})
		for (const key of ['fn', 'go', 'reg', 'quiet', 'unknown']) {
			await w.find(`[data-testid="cn-reports-header-button-${key}"]`).trigger('click')
		}
		expect(fn).toHaveBeenCalledWith({ actionId: 'fn' })
		expect(push).toHaveBeenCalledWith({ name: 'Export', params: { kind: 'all' } })
		expect(registered).toHaveBeenCalledWith({ actionId: 'reg' })
		expect(w.emitted('header-action').map(([p]) => p.id)).toEqual(['fn', 'go', 'reg', 'unknown'])
	})

	it('opens a navigate target URL in a new tab', async () => {
		const open = jest.spyOn(window, 'open').mockImplementation(() => null)
		const w = mountPage({
			props: {
				headerButtons: [{ label: 'Docs', action: 'docs' }],
				headerActions: [{ id: 'docs', label: 'Docs', type: 'navigate', target: 'https://example.test/docs' }],
			},
		})
		await w.find('[data-testid="cn-reports-header-button-docs"]').trigger('click')
		expect(open).toHaveBeenCalledWith('https://example.test/docs', '_blank', 'noopener,noreferrer')
		open.mockRestore()
	})
})
