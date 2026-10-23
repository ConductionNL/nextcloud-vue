/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A body section may name a library widget `type` instead of a host
 * `component`: it renders that widget's renderer with its `content` and the
 * page's record, in the same placement and card as any other section.
 *
 * @spec openspec/changes/handoff-action/specs/handoff-action/spec.md#requirement-a-body-section-can-be-a-library-widget
 */

import { mount } from '@vue/test-utils'
import { h } from 'vue'
import CnBodySections from '../../src/components/CnBodySections/CnBodySections.vue'
import { registerDashboardWidget } from '../../src/components/CnWidgetGrid/dashboardWidgetRegistry.js'

const Probe = {
	name: 'Probe',
	props: ['content', 'objectId', 'objectData'],
	render() {
		return h('div', { class: 'probe' }, `${this.content.label}|${this.objectId}|${this.objectData.title}`)
	},
}

registerDashboardWidget('body-probe', { renderer: Probe, form: null, surfaces: ['detail-page'] })

describe('CnBodySections widget type', () => {
	it('renders a library widget with its content and the page record', () => {
		const w = mount(CnBodySections, {
			props: {
				sections: [{ id: 'probe', type: 'body-probe', title: 'Probe', card: true, content: { label: 'hi' } }],
				context: { objectId: 'obj-1', object: { title: 'Ticket' } },
			},
		})

		expect(w.find('.probe').text()).toBe('hi|obj-1|Ticket')
		expect(w.find('[data-section-id="probe"]').classes()).toContain('cn-body-sections__section--card')
	})

	it('shows the inline error for an unknown widget type', () => {
		const w = mount(CnBodySections, {
			props: { sections: [{ id: 'missing', type: 'no-such-widget' }] },
		})

		expect(w.find('[data-testid="cn-body-section-error-missing"]').exists()).toBe(true)
	})

	it('prefers a named host component over a type', () => {
		const Host = { name: 'Host', render: () => h('div', { class: 'host' }, 'host') }
		const w = mount(CnBodySections, {
			props: { sections: [{ id: 'both', component: 'Host', type: 'body-probe', content: { label: 'x' } }] },
			global: { provide: { cnRegistry: { Host: { kind: 'section', component: Host } } } },
		})

		expect(w.find('.host').exists()).toBe(true)
		expect(w.find('.probe').exists()).toBe(false)
	})

	it('leaves a section out while its visibleWhen does not hold', () => {
		const sections = [{ id: 'probe', type: 'body-probe', visibleWhen: { field: 'subjectReference', op: 'notEmpty' }, content: { label: 'hi' } }]
		const without = mount(CnBodySections, { props: { sections, context: { objectId: 't-1', object: { title: 'Ticket' } } } })
		expect(without.find('[data-section-id="probe"]').exists()).toBe(false)
		const withRef = mount(CnBodySections, { props: { sections, context: { objectId: 't-1', object: { title: 'Ticket', subjectReference: { title: 'Dossier' } } } } })
		expect(withRef.find('.probe').text()).toBe('hi|t-1|Ticket')
	})
})
