/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * An action label quotes what the entry recorded (`{changed.<key>}`), in the
 * words of `valueLabels` (DqSociaalDomein Historie: why a reader opened the case).
 *
 * @spec openspec/changes/audit-label-changed-values/specs/audit-trail/spec.md
 */
import { flushPromises, mount } from '@vue/test-utils'
import CnAuditTrailCard from '../../src/components/CnAuditTrailCard/CnAuditTrailCard.vue'
import CnAuditTrailWidget from '../../src/components/CnAuditTrailWidget/CnAuditTrailWidget.vue'

const ENTRIES = [
	{ id: 1, action: 'dossiq.case.access-purpose', actor: 'fatma', changed: { purpose: 'handling' }, created: '2026-10-06T09:00:00Z' },
	{ id: 2, action: 'dossiq.case.access-purpose', actor: 'fatma', changed: { purpose: 'other', note: 'x' }, created: '2026-10-05T09:00:00Z' },
	{ id: 3, action: 'dossiq.case.access-purpose', actor: 'fatma', changed: null, created: '2026-10-04T09:00:00Z' },
]

const LABELS = { 'dossiq.case.access-purpose': 'Opened, purpose {changed.purpose}' }

beforeEach(() => {
	global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ results: ENTRIES }) })
})

afterEach(() => {
	delete global.fetch
})

const actions = (w) => w.findAll('.cn-audit-card__action').map((row) => row.text())

describe('action labels quote recorded values', () => {
	it('fills a recorded value in its words, else as written, else with nothing', async () => {
		const w = mount(CnAuditTrailCard, { propsData: { source: { kind: 'flow-task', id: 't1' }, maxDisplay: 10, actionLabels: LABELS, valueLabels: { purpose: { handling: 'handling the case' } } } })
		await flushPromises()
		// A source reads oldest first.
		expect(actions(w)).toEqual(['Opened, purpose', 'Opened, purpose other', 'Opened, purpose handling the case'])
	})

	it('takes valueLabels from the widget content through the app translate', async () => {
		const w = mount(CnAuditTrailWidget, {
			propsData: { content: { source: { kind: 'flow-task', id: 't1' }, maxDisplay: 10, actionLabels: LABELS, valueLabels: { purpose: { handling: 'Handling' } } } },
			global: { provide: { cnTranslate: (key) => ({ Handling: 'behandeling', 'Opened, purpose {changed.purpose}': 'Ingezien, doel {changed.purpose}' }[key] || key) } },
		})
		await flushPromises()
		expect(actions(w)).toContain('Ingezien, doel behandeling')
	})
})
