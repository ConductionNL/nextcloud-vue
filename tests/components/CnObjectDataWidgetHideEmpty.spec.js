// SPDX-License-Identifier: EUPL-1.2
// SPDX-FileCopyrightText: 2026 Conduction B.V.

/*
 * CnObjectDataWidget — hide-empty (discriminated supertypes).
 *
 * `exclude` / `include` / `overrides.hidden` are static: they hide the same keys
 * for every object. That is the wrong tool for a supertype whose properties are
 * only relevant to some of its objects — one `ticket` schema holding
 * request | complaint | contactmoment, where a complaint never carries the
 * telephony fields a contactmoment does. Statically rendering the union means
 * every complaint shows a wall of em dashes.
 *
 * `hide-empty` makes the read grid show only what the object actually has, so
 * the page is type-aware without the schema enumerating which fields belong to
 * which variant. It must stay non-destructive: the field being edited, a field
 * with an unsaved change, and falsy-but-real values (false / 0) all survive.
 */

import { shallowMount } from '@vue/test-utils'
import CnObjectDataWidget from '../../src/components/CnObjectDataWidget/CnObjectDataWidget.vue'

const schema = {
	properties: {
		title: { type: 'string' },
		ticketType: { type: 'string' },
		complaintCategory: { type: 'string' },
		ctiExtension: { type: 'string' },
		recordingUrl: { type: 'string' },
		durationSeconds: { type: 'number' },
		isEscalated: { type: 'boolean' },
		tags: { type: 'array' },
	},
}

// A complaint: carries none of the telephony fields a contactmoment would.
const complaint = {
	title: 'Herhaalde storingen platform',
	ticketType: 'complaint',
	complaintCategory: 'service',
	ctiExtension: null,
	recordingUrl: '',
	tags: [],
}

const mountWith = (objectData, propsData = {}) => shallowMount(CnObjectDataWidget, {
	propsData: { schema, objectData, ...propsData },
	mocks: { t: (app, s) => s },
})

const keys = (vm) => vm.resolvedFields.map((f) => f.key)

describe('CnObjectDataWidget hide-empty', () => {
	it('renders every schema field when hide-empty is off (default)', () => {
		const w = mountWith(complaint)
		expect(keys(w.vm)).toEqual(expect.arrayContaining(['ctiExtension', 'recordingUrl', 'tags']))
	})

	it('drops null, empty-string and empty-array fields when hide-empty is on', () => {
		const w = mountWith(complaint, { hideEmpty: true })
		const shown = keys(w.vm)

		expect(shown).toEqual(expect.arrayContaining(['title', 'ticketType', 'complaintCategory']))
		expect(shown).not.toContain('ctiExtension')
		expect(shown).not.toContain('recordingUrl')
		expect(shown).not.toContain('tags')
	})

	it('drops fields absent from the object entirely', () => {
		const w = mountWith(complaint, { hideEmpty: true })
		// durationSeconds is in the schema but not on this complaint at all.
		expect(keys(w.vm)).not.toContain('durationSeconds')
	})

	it('keeps false and 0 — they are values, not absences', () => {
		const w = mountWith({ ...complaint, isEscalated: false, durationSeconds: 0 }, { hideEmpty: true })
		const shown = keys(w.vm)

		expect(shown).toContain('isEscalated')
		expect(shown).toContain('durationSeconds')
	})

	it('keeps the field being edited so it cannot vanish mid-edit', async () => {
		const w = mountWith(complaint, { hideEmpty: true })
		expect(keys(w.vm)).not.toContain('ctiExtension')

		w.vm.editingField = 'ctiExtension'
		await w.vm.$nextTick()

		expect(keys(w.vm)).toContain('ctiExtension')
	})

	it('keeps a field with an unsaved change', async () => {
		const w = mountWith(complaint, { hideEmpty: true })
		w.vm.dirtyFields = { recordingUrl: 'https://example.test/rec.mp3' }
		await w.vm.$nextTick()

		expect(keys(w.vm)).toContain('recordingUrl')
	})

	it('shows a contactmoment its telephony fields — same schema, different object', () => {
		const contactmoment = {
			title: 'Belafspraak',
			ticketType: 'contactmoment',
			ctiExtension: '204',
			recordingUrl: 'https://example.test/rec.mp3',
		}
		const w = mountWith(contactmoment, { hideEmpty: true })
		const shown = keys(w.vm)

		expect(shown).toContain('ctiExtension')
		expect(shown).toContain('recordingUrl')
		// ...and not the complaint-only field it does not carry.
		expect(shown).not.toContain('complaintCategory')
	})
})
