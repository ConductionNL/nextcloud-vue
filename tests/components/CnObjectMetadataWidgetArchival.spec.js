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

		expect(items.Appraisal).toBeUndefined()
		expect(items['Retention period']).toBeUndefined()
	})

	it('names what happens to the record and when', () => {
		const items = itemsFor(withRetention({
			appraisal: 'destroy',
			retentionPeriod: 'P10Y',
			disposalDate: '2036-09-10',
			recordState: 'active',
			basis: 'selection_list',
			source: 'Selectielijst gemeenten 2020',
			disposalCategory: '4.1.2',
		}))

		expect(items.Appraisal).toBe('Destroy')
		expect(items['Retention period']).toBe('10 years')
		expect(items['Record state']).toBe('Active')
		expect(items.Basis).toBe('Selection list')
		expect(items.Source).toBe('Selectielijst gemeenten 2020')
		expect(items['Selection list category']).toBe('4.1.2')
	})

	it('says keep permanently in words', () => {
		const items = itemsFor(withRetention({ appraisal: 'retain_permanently' }))
		expect(items.Appraisal).toBe('Keep permanently')
	})

	it('prints an unrecognised nomination rather than hiding it', () => {
		// Hiding it would report "no nomination" for a record that carries one,
		// which is the failure mode that buries a records obligation.
		const items = itemsFor(withRetention({ appraisal: 'overbrengen' }))
		expect(items.Appraisal).toBe('overbrengen')
	})

	it('leaves a duration it cannot parse exactly as stored', () => {
		// A retention period rendered wrong is worse than one rendered raw.
		const items = itemsFor(withRetention({ retentionPeriod: 'P1Y6M' }))
		expect(items['Retention period']).toBe('P1Y6M')
	})

	it('reports an active legal hold with its reason', () => {
		const items = itemsFor(withRetention({
			appraisal: 'destroy',
			legalHold: { active: true, reason: 'Pending appeal' },
		}))
		expect(items['Legal hold']).toContain('Pending appeal')
	})

	it('reports a released hold as released, not as never held', () => {
		const items = itemsFor(withRetention({
			appraisal: 'destroy',
			legalHold: { active: false, releasedCount: 2 },
		}))
		expect(items['Legal hold']).toContain('2')
	})

	it('honours include on the archival keys too', () => {
		const items = itemsFor(
			withRetention({ appraisal: 'destroy', retentionPeriod: 'P10Y', source: 'Selectielijst 2020' }),
			{ include: ['appraisal'] },
		)

		expect(items.Appraisal).toBe('Destroy')
		expect(items['Retention period']).toBeUndefined()
		expect(items.Source).toBeUndefined()
	})
})

describe('CnObjectMetadataWidget — categories', () => {
	/**
	 * Mount the widget and read back the group headings it rendered.
	 *
	 * Reads the DOM rather than the computed, because the thing being tested
	 * is that the template renders a grid per group — a computed returning
	 * five groups into a single flat grid would look identical from the vm.
	 *
	 * @param {object} objectData The record to render.
	 * @param {object} extra Extra props.
	 * @return {object} The wrapper and its headings.
	 */
	function groupsFor(objectData, extra = {}) {
		const wrapper = mount(CnObjectMetadataWidget, { propsData: { objectData, ...extra } })
		const headings = wrapper.findAll('.cn-object-metadata__group-title')
			.map((h) => h.text())
		return { wrapper, headings }
	}

	it('sorts the fields into categories rather than one wall of rows', () => {
		const { headings } = groupsFor({
			'@self': {
				uuid: 'abc',
				register: 'zaken',
				owner: 'admin',
				created: '2026-01-01T00:00:00+00:00',
				_retention: { appraisal: 'destroy' },
			},
		})

		expect(headings).toEqual(['Identity', 'Location', 'Ownership', 'Lifecycle', 'Archiving'])
	})

	it('drops a category with nothing in it instead of heading a void', () => {
		// An object with no archival obligation must not carry an "Archiving"
		// heading over an empty grid, which reads as a rendering fault.
		const { headings } = groupsFor({ '@self': { uuid: 'abc' } })

		expect(headings).toEqual(['Identity'])
	})

	it('collects host-supplied extras under their own heading, last', () => {
		const { headings } = groupsFor(
			{ '@self': { uuid: 'abc' } },
			{ extraItems: [{ label: 'Case number', value: 'Z-2026-1' }] },
		)

		expect(headings).toEqual(['Identity', 'Other'])
	})

	it('renders one flat grid when grouping is switched off', () => {
		const { wrapper } = groupsFor({ '@self': { uuid: 'abc', owner: 'admin' } }, { grouped: false })

		expect(wrapper.findAll('.cn-object-metadata__group-title')).toHaveLength(0)
		expect(wrapper.findAll('.cn-detail-grid')).toHaveLength(1)
	})
})

describe('CnObjectMetadataWidget — the folder link', () => {
	/**
	 * Read back the folder row as the widget built it.
	 *
	 * @param {*} folder The @self.folder value.
	 * @return {object|undefined} The folder item.
	 */
	function folderItem(folder) {
		const wrapper = mount(CnObjectMetadataWidget, {
			propsData: { objectData: { '@self': { folder } } },
		})
		return wrapper.vm.metadataItems.find((item) => item.label === 'Folder')
	}

	it('links a folder held as a node id straight into Files', () => {
		const item = folderItem('4213')

		expect(item.value).toBe('4213')
		expect(item.href).toContain('/apps/files/?fileid=4213&opendetails=true')
	})

	it('leaves a folder held as a path as plain text', () => {
		// A path is not a node id, so a deep-link built from it 404s. Silence
		// beats a link that goes nowhere.
		const item = folderItem('/Zaken/Z-2026-1')

		expect(item.value).toBe('/Zaken/Z-2026-1')
		expect(item.href).toBeNull()
	})
})
