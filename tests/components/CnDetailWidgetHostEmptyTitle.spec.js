/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A widget whose title is the empty string draws no title row; a widget with
 * a title keeps it (DqDocumentenBeheer: the Files card without "Bestanden").
 *
 * @spec openspec/changes/widget-title-when/specs/widget-title-when/spec.md#requirement-an-empty-title-is-a-card-without-a-title-row
 */
import { mount } from '@vue/test-utils'
import CnDetailWidgetHost from '../../src/components/CnDetailWidgetHost/CnDetailWidgetHost.vue'

const Pane = { name: 'Pane', props: ['objectId'], template: '<div class="pane" />' }

function mountHost(title) {
	return mount(CnDetailWidgetHost, {
		props: { widget: { id: 'w', type: 'pane', title }, chrome: 'card', objectId: 'case-1', object: { id: 'case-1' }, cnRegistry: { pane: { component: Pane, chrome: 'card' } } },
		global: { mocks: { t: (_a, s) => s } },
	})
}

describe('CnDetailWidgetHost: an empty title', () => {
	it('draws the title it is given', () => {
		expect(mountHost('Bestanden').text()).toContain('Bestanden')
	})

	it('draws no title row for an empty title', () => {
		const w = mountHost('')
		expect(w.find('.cn-widget-wrapper__header-left').exists()).toBe(false)
		expect(w.vm.leafCardTitle).toBe('')
		expect(w.vm.effectiveShowCardTitle).toBe(false)
	})
})
