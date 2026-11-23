/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A trail can say what happened by the field an entry changed
 * (`changeLabels`), with the record's own fields as `{object.<path>}`:
 * DqZaaktype Historie "Versie 4 gepubliceerd" for an update that set
 * `isDraft` to false.
 */
import { flushPromises, mount } from '@vue/test-utils'
import CnAuditTrailCard from '../../src/components/CnAuditTrailCard/CnAuditTrailCard.vue'
import CnAuditTrailWidget from '../../src/components/CnAuditTrailWidget/CnAuditTrailWidget.vue'

const ENTRIES = [
	{ id: 1, action: 'create', actor: 'lars', changed: null, created: '2026-09-28T09:00:00Z' },
	{ id: 2, action: 'update', actor: 'lars', changed: { variants: { old: [], new: [{ name: 'Met welstand' }] } }, created: '2026-09-30T09:00:00Z' },
	{ id: 3, action: 'update', actor: 'lars', changed: { isDraft: { old: true, new: false } }, created: '2026-10-02T09:00:00Z' },
	{ id: 4, action: 'update', actor: 'lars', changed: { isDraft: { old: false, new: true } }, created: '2026-10-03T09:00:00Z' },
]

const RULES = [
	{ action: 'update', field: 'isDraft', to: false, label: 'Version {object.version} published' },
	{ field: 'variants', label: 'Variants changed' },
]

beforeEach(() => {
	global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ results: ENTRIES }) })
})

afterEach(() => {
	delete global.fetch
})

const actions = (w) => w.findAll('.cn-audit-card__action').map((row) => row.text())

describe('change labels', () => {
	it('labels an entry by the field it changed, to the value the rule names, else by its action', async () => {
		const w = mount(CnAuditTrailCard, { propsData: { source: { kind: 'flow-task', id: 't1' }, maxDisplay: 10, changeLabels: RULES, object: { version: 4 }, actionLabels: { create: 'Created' } } })
		await flushPromises()
		// A source reads oldest first.
		expect(actions(w)).toEqual(['Created', 'Variants changed', 'Version 4 published', 'update'])
	})

	it('takes the rules from the widget content through the app translate, with the context object', async () => {
		const w = mount(CnAuditTrailWidget, {
			propsData: { content: { source: { kind: 'flow-task', id: 't1' }, maxDisplay: 10, changeLabels: RULES } },
			global: { provide: { cnTranslate: (key) => ({ 'Version {object.version} published': 'Versie {object.version} gepubliceerd' }[key] || key), cnObjectContext: { value: { object: { version: 4 } } } } },
		})
		await flushPromises()
		expect(actions(w)).toContain('Versie 4 gepubliceerd')
	})
})
