/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A history card can end in a muted line about the record: DqZaaktype's
 * Historie card closes with "Kenmerk ZT-OMV-REG", the case type's
 * identifier, under the trail.
 *
 * @spec openspec/changes/audit-trail-footnote/specs/audit-trail/spec.md#requirement-a-history-card-can-end-in-a-line-about-the-record
 */
import { shallowMount } from '@vue/test-utils'

const CnAuditTrailWidget = require('../../src/components/CnAuditTrailWidget/CnAuditTrailWidget.vue').default

function mountWidget(footnote, object, translate = (text) => text) {
	return shallowMount(CnAuditTrailWidget, {
		props: { content: { footnote } },
		global: {
			provide: {
				cnTranslate: translate,
				cnObjectContext: { value: { register: 'dossiq', schema: 'caseType', objectId: 'ct-1', object } },
			},
		},
	})
}

/**
 * The footnote the widget hands its card.
 *
 * @param {import('@vue/test-utils').VueWrapper} w The widget.
 * @return {{exists: Function, text: Function}} The footnote.
 */
function footnoteOf(w) {
	const card = w.findComponent({ name: 'CnAuditTrailCard' })
	return { exists: () => Boolean(card.props('footnote')), text: () => card.props('footnote') }
}

describe('CnAuditTrailWidget footnote', () => {
	it('fills the record into the translated line under the trail', () => {
		const w = mountWidget('Reference {identifier}', { identifier: 'ZT-OMV-REG' }, (text) => (text === 'Reference {identifier}' ? 'Kenmerk {identifier}' : text))
		expect(w.findComponent({ name: 'CnAuditTrailCard' }).exists()).toBe(true)
		expect(footnoteOf(w).text()).toBe('Kenmerk ZT-OMV-REG')
	})

	it('draws no line when the record has no value for it, or none is declared', () => {
		expect(footnoteOf(mountWidget('Reference {identifier}', {})).exists()).toBe(false)
		expect(footnoteOf(mountWidget(undefined, { identifier: 'ZT-OMV-REG' })).exists()).toBe(false)
	})

	it('hands the line to the card, which draws it inside its own box', () => {
		const w = mountWidget('Reference {identifier}', { identifier: 'ZT-OMV-REG' })
		expect(w.find('[data-testid="cn-audit-trail-widget-footnote"]').exists()).toBe(false)
		expect(w.findComponent({ name: 'CnAuditTrailCard' }).props('footnote')).toBe('Reference ZT-OMV-REG')
	})
})

describe('CnAuditTrailCard footnote', () => {
	it('draws the footnote inside the card, under the trail', () => {
		const CnAuditTrailCard = require('../../src/components/CnAuditTrailCard/CnAuditTrailCard.vue').default
		const w = shallowMount(CnAuditTrailCard, {
			props: { register: 'dossiq', schema: 'caseType', objectId: 'ct-1', footnote: 'Kenmerk ZT-OMV-REG' },
			global: { stubs: { CnDetailCard: { template: '<section class="card"><slot /><slot name="footer" /></section>' } } },
		})
		expect(w.find('.card [data-testid="cn-audit-trail-widget-footnote"]').text()).toBe('Kenmerk ZT-OMV-REG')
	})
})
