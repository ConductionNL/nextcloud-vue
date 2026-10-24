// SPDX-License-Identifier: EUPL-1.2
// SPDX-FileCopyrightText: 2026 Conduction B.V.

/*
 * CnObjectDataWidget — `overrides[key].emptyValue` and a single column in the
 * board look.
 *
 * DqZaakBetrokkenen "Zetels" draws "Wacht op oppakken: Nee" and "Doorgegeven
 * aan: Niemand" in one column. r25b drew em dashes in three columns: the board
 * look ignored `columns`, and an empty or false value had no words of its own.
 *
 * @spec openspec/changes/data-widget-empty-value-one-column/specs/data-widget/spec.md
 */

import { shallowMount } from '@vue/test-utils'
import CnObjectDataWidget from '../../src/components/CnObjectDataWidget/CnObjectDataWidget.vue'

const schema = {
	properties: {
		assignee: { type: 'string' },
		handoverPending: { type: 'boolean' },
		handoverTo: { type: 'string' },
	},
}

function mountWith(objectData, propsData = {}, provide = {}) {
	return shallowMount(CnObjectDataWidget, {
		propsData: { schema, objectData, ...propsData },
		mocks: { t: (app, s) => s },
		provide,
	})
}

describe('CnObjectDataWidget emptyValue', () => {
	const overrides = { handoverPending: { emptyValue: 'No' }, handoverTo: { emptyValue: 'Nobody' } }

	it('shows the override\'s words for an empty value and for false, translated', () => {
		const w = mountWith({ assignee: 'pieter', handoverPending: false, handoverTo: null }, { overrides }, { cnTranslate: (key) => ({ No: 'Nee', Nobody: 'Niemand' }[key] || key) })
		expect(w.vm.displayValues.handoverPending).toBe('Nee')
		expect(w.vm.displayValues.handoverTo).toBe('Niemand')
	})

	it('keeps a filled value and the dash without an override', () => {
		const w = mountWith({ assignee: '', handoverPending: true, handoverTo: 'ann' }, { overrides })
		expect(w.vm.displayValues.handoverTo).toBe('ann')
		expect(w.vm.displayValues.handoverPending).not.toBe('No')
		expect(w.vm.displayValues.assignee).toBe('—')
	})
})

describe('CnObjectDataWidget columns in the board look', () => {
	it('keeps one column when the config asks for one', () => {
		const w = mountWith({ assignee: 'pieter' }, { columns: 1 }, { cnLook: 'board' })
		expect(w.vm.gridStyle['grid-template-columns']).toBe('minmax(0, 1fr)')
	})

	it('fits 200px columns otherwise', () => {
		const w = mountWith({ assignee: 'pieter' }, { columns: 2 }, { cnLook: 'board' })
		expect(w.vm.gridStyle['grid-template-columns']).toBe('repeat(auto-fit, minmax(200px, 1fr))')
	})
})
