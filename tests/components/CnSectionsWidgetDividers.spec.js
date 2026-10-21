/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `dividers: false` stacks the sections as strips, with no rule between them.
 *
 * @spec openspec/changes/dq-abstract-record-widgets/specs/record-widgets/spec.md#requirement-sections-can-stack-without-dividers
 */
import { mount } from '@vue/test-utils'
import CnSectionsWidget from '../../src/components/CnSectionsWidget/CnSectionsWidget.vue'

const WIDGETS = [{ id: 'a', type: 'banner', content: { text: 'A' } }, { id: 'b', type: 'banner', content: { text: 'B' } }]

function mountSections(content) {
	return mount(CnSectionsWidget, {
		props: { content: { sections: [{ widgetId: 'a' }, { widgetId: 'b' }], ...content }, availableWidgets: WIDGETS },
		global: { stubs: { CnDetailWidgetHost: { props: ['widget'], template: '<p>{{ widget.id }}</p>' } } },
	})
}

describe('CnSectionsWidget dividers', () => {
	it('draws rules by default', () => {
		expect(mountSections({}).classes()).not.toContain('cn-sections-widget--plain')
	})

	it('stacks plain strips with dividers: false', () => {
		expect(mountSections({ dividers: false }).classes()).toContain('cn-sections-widget--plain')
	})

	it('keeps cards drawn as cards', () => {
		expect(mountSections({ dividers: false, cards: true }).classes()).not.toContain('cn-sections-widget--plain')
	})
})
