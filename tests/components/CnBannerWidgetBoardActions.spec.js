/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The attention card under the board look shows the actions the board draws
 * (screens-banner-actions-parity): DqMijnWerk's "Vandaag eerst" has three
 * secondary actions and the primary "Zaak openen" last. Without the look the
 * card keeps its two.
 */
import { mount } from '@vue/test-utils'
import CnBannerWidget from '../../src/components/CnBannerWidget/CnBannerWidget.vue'

const ACTIONS = [
	{ label: 'All cases past term', href: '/cases?overdue=1' },
	{ label: 'To the board', href: '/board' },
	{ label: 'Suspend the term', id: 'suspend' },
	{ label: 'Open case', href: '/cases/61', primary: true },
	{ label: 'A fifth' },
]

function mountCard(props = {}, look = 'nextcloud') {
	return mount(CnBannerWidget, {
		props: { layout: 'attention', variant: 'error', title: 'Parking permits', actions: ACTIONS, ...props },
		global: { provide: { cnLook: look } },
	})
}

function labels(w) {
	return w.findAll('[data-testid="cn-banner-widget-action"]').map((a) => a.text())
}

describe('CnBannerWidget attention actions', () => {
	it('keeps two without the board look', () => {
		expect(labels(mountCard())).toEqual(['All cases past term', 'To the board'])
	})

	it('shows four under the board look, in order, the one marked primary as primary', () => {
		const w = mountCard({}, 'board')
		expect(labels(w)).toEqual(['All cases past term', 'To the board', 'Suspend the term', 'Open case'])
		const actions = w.findAll('[data-testid="cn-banner-widget-action"]')
		expect(actions[3].classes()).toContain('cn-banner-widget__action--primary')
		expect(actions[0].classes()).toContain('cn-banner-widget__action--secondary')
		expect(actions[2].element.tagName).toBe('BUTTON')
		expect(actions[0].element.tagName).toBe('A')
	})

	it('takes maxActions from the prop or the content, in either look', () => {
		expect(labels(mountCard({ maxActions: 3 }))).toHaveLength(3)
		expect(labels(mountCard({ maxActions: 1 }, 'board'))).toEqual(['All cases past term'])
		const w = mount(CnBannerWidget, { props: { content: { layout: 'attention', title: 'T', actions: ACTIONS, maxActions: 5 } } })
		expect(labels(w)).toHaveLength(5)
	})

	it('ignores a maxActions that is not a positive whole number', () => {
		expect(labels(mountCard({ maxActions: 0 }))).toHaveLength(2)
		expect(labels(mountCard({ maxActions: 0 }, 'board'))).toHaveLength(4)
	})
})
