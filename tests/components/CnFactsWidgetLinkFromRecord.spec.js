/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A facts link takes its words from the record: the label and a muted note
 * under it fill `{path:format}` placeholders, and `first-segment` /
 * `last-segment` read one part of a path (Werkinstructie: "Hoe we
 * Woo-verzoeken behandelen", "Uit Collectives, team Woo en informatie.").
 *
 * @spec openspec/changes/facts-link-label-from-record/specs/facts-widget/spec.md
 */
import { mount } from '@vue/test-utils'

const CnFactsWidget = require('../../src/components/CnFactsWidget/CnFactsWidget.vue').default

function mountWith(link) {
	return mount(CnFactsWidget, {
		props: {
			content: { fields: [], link: { href: '{page}', hrefBase: '/apps/collectives/', ...link } },
			objectData: { page: 'Woo en informatie/Hoe we Woo-verzoeken behandelen' },
		},
	})
}

describe('CnFactsWidget link words from the record', () => {
	it('fills the label and the note from the record', () => {
		const w = mountWith({ label: '{page:last-segment}', note: 'From Collectives, team {page:first-segment}.' })
		expect(w.find('[data-testid="cn-facts-link"]').text()).toBe('Hoe we Woo-verzoeken behandelen')
		expect(w.find('[data-testid="cn-facts-link-note"]').text()).toBe('From Collectives, team Woo en informatie.')
	})

	it('keeps a plain label and draws no note without one', () => {
		const w = mountWith({ label: 'Read how we handle this kind of case' })
		expect(w.find('[data-testid="cn-facts-link"]').text()).toBe('Read how we handle this kind of case')
		expect(w.find('[data-testid="cn-facts-link-note"]').exists()).toBe(false)
	})
})
