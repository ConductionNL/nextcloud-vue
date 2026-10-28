/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `gap` sets the space between plain sections in pixels: board PqJourney puts
 * the journey's steps 14px under its facts, where plain sections stand 8px
 * apart.
 *
 * @spec openspec/changes/sections-gap/specs/sections-widget/spec.md#requirement-plain-sections-can-set-the-space-between-them
 */
import { mount } from '@vue/test-utils'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import CnSectionsWidget from '../../src/components/CnSectionsWidget/CnSectionsWidget.vue'

const WIDGETS = [{ id: 'a', type: 'banner', content: { text: 'A' } }, { id: 'b', type: 'banner', content: { text: 'B' } }]

function mountSections(content) {
	return mount(CnSectionsWidget, {
		props: { content: { sections: [{ widgetId: 'a' }, { widgetId: 'b' }], ...content }, availableWidgets: WIDGETS },
		global: { stubs: { CnDetailWidgetHost: { props: ['widget'], template: '<p>{{ widget.id }}</p>' } } },
	})
}

describe('CnSectionsWidget gap', () => {
	it('sets the space between plain sections', () => {
		expect(mountSections({ dividers: false, gap: 14 }).attributes('style')).toContain('--cn-sections-gap: 14px')
	})

	it('sets nothing without the key or for a value that is not a size', () => {
		expect(mountSections({ dividers: false }).attributes('style')).toBeUndefined()
		expect(mountSections({ dividers: false, gap: 'wide' }).attributes('style')).toBeUndefined()
	})

	it('reads the space in the plain column gap', () => {
		const source = readFileSync(resolve(__dirname, '../../src/components/CnSectionsWidget/CnSectionsWidget.vue'), 'utf8')
		expect(source).toMatch(/\.cn-sections-widget--plain \.cn-sections-widget__column \{\s*gap: var\(--cn-sections-gap, /)
	})
})
