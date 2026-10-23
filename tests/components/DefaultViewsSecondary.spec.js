/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Default views marked `secondary` wait behind "More default views", and a
 * default view carries its own line (DqFilterBeheren "Mijn zaken /
 * Behandelaar is ik").
 *
 * @spec openspec/changes/default-views-secondary/specs/default-views-secondary/spec.md#requirement-a-default-view-can-wait-behind-more-default-views
 */
const { mount } = require('@vue/test-utils')
const CnSavedViewsPanel = require('../../src/components/CnSavedViewsPanel/CnSavedViewsPanel.vue').default
const { defaultFilterViews } = require('../../src/utils/savedViewHelpers.js')

const defaults = defaultFilterViews([
	{ slug: 'mine', name: 'Mijn zaken', description: 'Behandelaar is ik', filters: { assignee: '@me' } },
	{ slug: 'overdue', name: 'Termijn verstreken', filters: {} },
	{ slug: 'subsidies', name: 'Subsidies', secondary: true, filters: {} },
], { register: 'r', schema: 's' })

const names = (w) => w.findAll('[data-testid="cn-saved-views-item"]').map((b) => b.find('.cn-saved-views-panel__name-text').text())

describe('secondary default views', () => {
	it('carries the description and the secondary mark onto the view', () => {
		expect(defaults[0].description).toBe('Behandelaar is ik')
		expect(defaults[2].secondary).toBe(true)
		expect('secondary' in defaults[0]).toBe(false)
	})

	it('folds the secondary defaults behind More default views', async () => {
		const w = mount(CnSavedViewsPanel, { props: { views: defaults, currentUserId: 'pieter' } })
		expect(names(w)).toEqual(['Mijn zaken', 'Termijn verstreken'])
		const more = w.get('[data-testid="cn-saved-views-more-defaults"]')
		expect(more.attributes('aria-expanded')).toBe('false')
		expect(more.text()).toBe('More default views')
		await more.trigger('click')
		expect(names(w).sort()).toEqual(['Mijn zaken', 'Subsidies', 'Termijn verstreken'])
		expect(more.attributes('aria-expanded')).toBe('true')
	})

	it('shows a secondary default while it is the applied view', () => {
		const w = mount(CnSavedViewsPanel, { props: { views: defaults, currentUserId: 'pieter', selectedViewId: 'default:subsidies' } })
		expect(names(w)).toContain('Subsidies')
	})

	it('draws the default view\'s line', () => {
		const w = mount(CnSavedViewsPanel, { props: { views: defaults, currentUserId: 'pieter' } })
		expect(w.find('.cn-saved-views-panel__subline').text()).toBe('Behandelaar is ik')
	})

	it('draws no button when no default is secondary', () => {
		const w = mount(CnSavedViewsPanel, { props: { views: defaults.slice(0, 2), currentUserId: 'pieter' } })
		expect(w.find('[data-testid="cn-saved-views-more-defaults"]').exists()).toBe(false)
	})
})
