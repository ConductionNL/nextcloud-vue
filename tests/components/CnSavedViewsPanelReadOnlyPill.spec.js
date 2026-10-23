/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The Default views caption carries a "Read only" pill, and the line under it
 * says where the views come from (board DqFilterBeheren, DqFilterInMenu:
 * "Standaardweergaven" with "Alleen lezen", then "Geleverd door ...").
 *
 * @spec openspec/changes/saved-views-default-read-only-pill/specs/saved-views-default-read-only-pill/spec.md#requirement-the-default-views-caption-says-read-only-as-a-pill
 */

import { mount } from '@vue/test-utils'
import CnSavedViewsPanel from '../../src/components/CnSavedViewsPanel/CnSavedViewsPanel.vue'

const VIEWS = [
	{ id: 'mine-1', name: 'Mijn zaken', owner: 'pieter', access: 'owner' },
	{ id: 'seed-1', name: 'Wacht op inwoner', seeded: true },
]

describe('CnSavedViewsPanel default views caption', () => {
	it('carries a Read only pill and a hint without the words read only', () => {
		const wrapper = mount(CnSavedViewsPanel, { props: { views: VIEWS }, global: { stubs: { NcActions: true, NcActionButton: true } } })
		const caption = wrapper.find('[data-testid="cn-saved-views-section-seeded"]')
		expect(caption.exists()).toBe(true)
		const pill = caption.find('[data-testid="cn-saved-views-read-only"]')
		expect(pill.exists()).toBe(true)
		expect(pill.text()).toBe('Read only')
		expect(wrapper.text()).toContain('Shipped with the app; a new version updates them.')
		expect(wrapper.text()).not.toContain('Read only. Shipped')
	})

	it('puts no pill on the other captions', () => {
		const wrapper = mount(CnSavedViewsPanel, { props: { views: VIEWS }, global: { stubs: { NcActions: true, NcActionButton: true } } })
		expect(wrapper.findAll('[data-testid="cn-saved-views-read-only"]')).toHaveLength(1)
	})
})
