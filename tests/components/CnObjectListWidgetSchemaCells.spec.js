/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A manifest that names a list's columns (with their own labels) still gets
 * the schema's presentation for each column: a `date-time` property renders
 * as a date, an enum as its label. Measured on dossiq: a labelled contact
 * moment column printed the stored `phone` and `2026-09-10T08:05:00+00:00`.
 *
 * @spec openspec/changes/object-list-schema-cell-format/specs/object-list/spec.md#requirement-a-named-column-keeps-the-schema-s-format-and-enum-labels
 */
import { shallowMount } from '@vue/test-utils'
import CnObjectListWidget from '../../src/components/CnObjectListWidget/CnObjectListWidget.vue'

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: () => Promise.resolve({ status: 200, data: {} }) },
}))

const MOMENT_SCHEMA = {
	properties: {
		channel: { type: 'string', enum: ['phone', 'email'], 'x-enum-labels': { phone: 'Phone', email: 'Email' } },
		receivedAt: { type: 'string', format: 'date-time' },
		note: { type: 'string' },
	},
}

function mountWidget(columns) {
	return shallowMount(CnObjectListWidget, {
		propsData: { content: { register: 'r', schema: 'contactMoment', columns } },
		stubs: { CnDataTable: true, CnFormDialog: true },
		mocks: { t: (_app, s) => s },
	})
}

describe('CnObjectListWidget: schema presentation on named columns', () => {
	it('takes format and enum labels from the schema for a labelled column', async () => {
		const w = mountWidget([{ key: 'channel', label: 'Kanaal' }, { key: 'receivedAt', label: 'Ontvangen' }, { key: 'note', label: 'Notitie' }])
		w.vm.createSchema = MOMENT_SCHEMA
		await w.vm.$nextTick()

		const [channel, received, note] = w.vm.resolvedColumns
		expect(channel).toMatchObject({ label: 'Kanaal', enum: ['phone', 'email'], enumLabels: { phone: 'Phone', email: 'Email' } })
		expect(received).toMatchObject({ label: 'Ontvangen', format: 'date-time' })
		expect(note.format).toBeUndefined()
		expect(note.enum).toBeUndefined()
	})

	it("keeps a column's own format, enum and widget", async () => {
		const w = mountWidget([
			{ key: 'receivedAt', label: 'Ontvangen', format: 'date' },
			{ key: 'channel', label: 'Kanaal', enum: ['phone'], enumLabels: { phone: 'Telefoon' } },
			{ key: 'channel', label: 'Kanaal', widget: 'badge' },
		])
		w.vm.createSchema = MOMENT_SCHEMA
		await w.vm.$nextTick()

		const [received, channel, badge] = w.vm.resolvedColumns
		expect(received.format).toBe('date')
		expect(channel.enumLabels).toEqual({ phone: 'Telefoon' })
		expect(badge.enum).toBeUndefined()
	})

	it('loads the schema for a labelled column whose presentation the schema holds', async () => {
		const w = mountWidget([{ key: 'channel', label: 'Kanaal' }])
		let fetched = false
		w.vm.ensureSchema = async () => {
			fetched = true
		}

		await w.vm.loadHeadingsIfNeeded()

		expect(fetched).toBe(true)
	})
})
