/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A card subtitle `[{ when, text }]` follows the record and the records the
 * detail page reads beside it (`@context.<name>`), as a `visibleWhen` does.
 *
 * @spec openspec/changes/widget-subtitle-by-condition/specs/widget-subtitle-by-condition/spec.md#requirement-a-card-subtitle-can-depend-on-the-record
 */
import { mount } from '@vue/test-utils'
import CnDetailWidgetHost from '../../src/components/CnDetailWidgetHost/CnDetailWidgetHost.vue'

const Pane = { name: 'Pane', props: ['objectId'], template: '<div class="pane" />' }
const SUBTITLE = [{ when: { field: '@context.caseType.documentReview.enabled', op: 'eq', value: true }, text: 'Per document beoordelen' }]

function mountHost(rows) {
	return mount(CnDetailWidgetHost, {
		props: { widget: { id: 'w', type: 'pane', title: 'Bestanden', subtitle: SUBTITLE }, chrome: 'card', objectId: 'case-1', object: { id: 'case-1' }, cnRegistry: { pane: { component: Pane, chrome: 'card' } } },
		global: { mocks: { t: (_a, s) => s }, provide: { cnDetailVisibilityRows: { value: rows } } },
	})
}

const subtitle = (w) => w.find('[data-testid="cn-widget-wrapper-subtitle"]')

describe('CnDetailWidgetHost: a subtitle by condition', () => {
	it('shows the line where the condition holds', () => {
		expect(subtitle(mountHost({ caseType: { documentReview: { enabled: true } } })).text()).toBe('Per document beoordelen')
	})

	it('shows none where it does not, or while the context is on its way', () => {
		expect(subtitle(mountHost({ caseType: { documentReview: { enabled: false } } })).exists()).toBe(false)
		expect(subtitle(mountHost(null)).exists()).toBe(false)
	})
})
