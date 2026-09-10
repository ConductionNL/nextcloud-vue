/**
 * Tests for the metadata panel's archival group, its version row, and the
 * business-property leak it used to have.
 *
 * The leak is the one worth reading twice. `metadataSource` merged
 * `{ ...record, ...record['@self'] }`, so any SCHEMA property sharing a name
 * with a metadata field appeared in the metadata list. Measured on a dossiq
 * case: the panel reported `STATUS active` — the case's own workflow status —
 * while the page header beside it read `Unknown`, because the two were reading
 * different things and only one of them was metadata.
 *
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 */

const { mount } = require('@vue/test-utils')
const CnObjectMetadataWidget = require('../../src/components/CnObjectMetadataWidget/CnObjectMetadataWidget.vue').default

/**
 * Mount the widget and read back its rendered label → value pairs.
 *
 * @param {object} objectData The record to render.
 * @param {object} extra Extra props.
 * @return {object} A map of label to value.
 */
function itemsFor(objectData, extra = {}) {
	const wrapper = mount(CnObjectMetadataWidget, { propsData: { objectData, ...extra } })
	const map = {}
	for (const item of wrapper.vm.metadataItems) {
		map[item.label] = item.value
	}
	return map
}

describe('CnObjectMetadataWidget — the @self boundary', () => {
	it('does not leak a business property into the metadata list', () => {
		const items = itemsFor({
			status: 'active',
			version: 'v3 of the drawing',
			'@self': { id: 'abc', owner: 'admin' },
		})

		expect(items.Status).toBeUndefined()
		expect(items.Version).toBeUndefined()
		expect(items.Owner).toBe('admin')
	})

	it('still reads a flattened record with no @self block', () => {
		// Several widget props pass a pre-flattened metadata object, and for
		// those the top level genuinely IS the metadata.
		const items = itemsFor({ id: 'abc', owner: 'admin', version: '0.0.4' })

		expect(items.ID).toBe('abc')
		expect(items.Owner).toBe('admin')
		expect(items.Version).toBe('0.0.4')
	})

	it('carries the top-level id, which the API mirrors out of @self', () => {
		const items = itemsFor({ id: 'abc', '@self': { owner: 'admin' } })
		expect(items.ID).toBe('abc')
	})

	it('shows the object version from @self', () => {
		const items = itemsFor({ '@self': { version: '0.0.7' } })
		expect(items.Version).toBe('0.0.7')
	})

	it('renders a lock as a sentence, not as its JSON', () => {
		const items = itemsFor({
			'@self': { locked: { user: 'bob', displayName: 'Bob Bakker', expiresAt: '2026-09-10T12:00:00+00:00' } },
		})

		expect(items.Locked).toContain('Bob Bakker')
		expect(items.Locked).not.toContain('{')
	})
})

describe('CnObjectMetadataWidget — the archival group', () => {
	const withRetention = (retention) => ({ '@self': { id: 'abc', _retention: retention } })

	it('shows nothing archival on an object with no obligation', () => {
		const items = itemsFor({ '@self': { id: 'abc' } })

		expect(items['Archival action']).toBeUndefined()
		expect(items['Retention period']).toBeUndefined()
	})

	it('names what happens to the record and when', () => {
		const items = itemsFor(withRetention({
			nomination: 'vernietigen',
			period: 'P10Y',
			actionDate: '2036-09-10',
			status: 'nog_te_archiveren',
			basis: 'selectielijst',
			source: 'Selectielijst gemeenten 2020',
			classification: '4.1.2',
		}))

		expect(items['Archival action']).toBe('Destroy')
		expect(items['Retention period']).toBe('10 years')
		expect(items['Archival status']).toBe('nog_te_archiveren')
		expect(items.Basis).toBe('Selection list')
		expect(items.Source).toBe('Selectielijst gemeenten 2020')
		expect(items['Selection list category']).toBe('4.1.2')
	})

	it('says keep permanently in words', () => {
		const items = itemsFor(withRetention({ nomination: 'blijvend_bewaren' }))
		expect(items['Archival action']).toBe('Keep permanently')
	})

	it('prints an unrecognised nomination rather than hiding it', () => {
		// Hiding it would report "no nomination" for a record that carries one,
		// which is the failure mode that buries a records obligation.
		const items = itemsFor(withRetention({ nomination: 'overbrengen' }))
		expect(items['Archival action']).toBe('overbrengen')
	})

	it('leaves a duration it cannot parse exactly as stored', () => {
		// A retention period rendered wrong is worse than one rendered raw.
		const items = itemsFor(withRetention({ period: 'P1Y6M' }))
		expect(items['Retention period']).toBe('P1Y6M')
	})

	it('reports an active legal hold with its reason', () => {
		const items = itemsFor(withRetention({
			nomination: 'vernietigen',
			legalHold: { active: true, reason: 'Pending appeal' },
		}))
		expect(items['Legal hold']).toContain('Pending appeal')
	})

	it('reports a released hold as released, not as never held', () => {
		const items = itemsFor(withRetention({
			nomination: 'vernietigen',
			legalHold: { active: false, releasedCount: 2 },
		}))
		expect(items['Legal hold']).toContain('2')
	})

	it('honours include on the archival keys too', () => {
		const items = itemsFor(
			withRetention({ nomination: 'vernietigen', period: 'P10Y', source: 'Selectielijst 2020' }),
			{ include: ['nomination'] },
		)

		expect(items['Archival action']).toBe('Destroy')
		expect(items['Retention period']).toBeUndefined()
		expect(items.Source).toBeUndefined()
	})
})
