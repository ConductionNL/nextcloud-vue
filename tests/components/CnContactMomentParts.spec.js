/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Three small parts board PqContactmoment draws: a facts lead drawn as a
 * bordered card that links to its record and carries a status pill, a "what
 * now" side that opens on a bold sentence above the muted line, and a
 * record-notes outcome button that may be the primary one.
 *
 * @spec openspec/changes/contact-moment-parts/specs/contact-moment-parts/spec.md
 */
jest.mock('@nextcloud/event-bus', () => ({ __esModule: true, emit: jest.fn(), subscribe: jest.fn(), unsubscribe: jest.fn() }))
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { patch: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: (url) => `/index.php${url}` }))

import { mount } from '@vue/test-utils'
import fs from 'fs'
import path from 'path'
import CnFactsWidget from '../../src/components/CnFactsWidget/CnFactsWidget.vue'
import CnNextStepCard from '../../src/components/CnNextStepCard/CnNextStepCard.vue'
import CnRecordNotesWidget from '../../src/components/CnRecordNotesWidget/CnRecordNotesWidget.vue'
import { resolveNextStep } from '../../src/utils/detailActionModel.js'

const FACTS_SOURCE = fs.readFileSync(path.join(__dirname, '../../src/components/CnFactsWidget/CnFactsWidget.vue'), 'utf8')
const DETAIL_SOURCE = fs.readFileSync(path.join(__dirname, '../../src/components/CnDetailPage/CnDetailPage.vue'), 'utf8')

/**
 * @param {object} lead The lead entry.
 * @return {object} Wrapper.
 */
function mountLead(lead) {
	return mount(CnFactsWidget, {
		props: {
			content: { fields: [{ as: 'lead', key: 'request', icon: 'MessageTextOutline', title: 'title', ...lead }] },
			objectData: { id: 't-9', title: 'Afvalpas werkt niet bij de container', status: 'in_progress' },
			objectId: 't-9',
		},
		global: {
			provide: { cnTranslate: (key) => key },
			stubs: {
				CnIcon: { props: ['name'], template: '<i class="icon" :data-name="name" />' },
				RouterLink: { props: ['to'], template: '<a class="router-link" :data-to="JSON.stringify(to)"><slot /></a>' },
			},
		},
	})
}

describe('facts lead as a card', () => {
	it('draws a lead with card: true as a bordered card', () => {
		const lead = mountLead({ card: true }).find('[data-testid="cn-fact-request"]')
		expect(lead.classes()).toContain('cn-facts-widget__lead--card')
		const at = FACTS_SOURCE.indexOf('.cn-facts-widget__lead--card {')
		expect(at).toBeGreaterThan(-1)
		expect(FACTS_SOURCE.slice(at, FACTS_SOURCE.indexOf('}', at))).toContain('border: 1px solid')
	})

	it('leaves a plain lead without the card class', () => {
		expect(mountLead({}).find('[data-testid="cn-fact-request"]').classes()).not.toContain('cn-facts-widget__lead--card')
	})

	it('links the whole lead to its route', () => {
		const lead = mountLead({ card: true, route: { name: 'TicketDetail', params: { id: '@objectId' } } }).find('[data-testid="cn-fact-request"]')
		expect(lead.classes()).toContain('router-link')
		expect(lead.attributes('data-to')).toContain('t-9')
	})

	it('ends the lead on a status pill toned by the raw value', () => {
		const w = mountLead({ card: true, pill: { path: 'status', map: { in_progress: 'In progress' }, variantMap: { in_progress: 'purple' } } })
		const pill = w.find('[data-testid="cn-fact-request"] .cn-facts-widget__lead-pill')
		expect(pill.exists()).toBe(true)
		expect(pill.text()).toBe('In progress')
		expect(pill.classes().join(' ')).toContain('purple')
	})
})

describe('what now side with a bold lead sentence', () => {
	it('passes a stage afterTitle through resolveNextStep', () => {
		const card = resolveNextStep({ stages: { new: { afterTitle: 'A contact moment has no customer to answer.', after: 'Close it via More.', checklist: [{ label: 'x', doneField: 'client' }] } } }, { status: 'new' })
		expect(card.afterTitle).toBe('A contact moment has no customer to answer.')
		expect(card.after).toBe('Close it via More.')
	})

	it('draws afterTitle above the after line', () => {
		const w = mount(CnNextStepCard, { props: { items: [{ label: 'x' }], afterTitle: 'A contact moment has no customer to answer.', after: 'Close it via More.' } })
		const side = w.find('.cn-next-step-card__side')
		expect(side.find('.cn-next-step-card__after-title').text()).toBe('A contact moment has no customer to answer.')
		expect(side.find('.cn-next-step-card__after').text()).toBe('Close it via More.')
	})

	it('hands afterTitle from the detail page to the card', () => {
		expect(DETAIL_SOURCE).toMatch(/:afterTitle="nextStepCard\.afterTitle"/)
		expect(DETAIL_SOURCE).toMatch(/afterTitle: firstFilled\(card\.afterTitle/)
	})
})

describe('record notes outcome button variant', () => {
	const content = (saveVariant) => ({ field: 'notes', outcome: { field: 'outcome', saveLabel: 'Note the outcome', saveVariant, options: [{ value: 'a', label: 'A' }] } })
	const record = { id: 't-1', notes: '', outcome: '', '@self': { id: 't-1', register: 'r', schema: 's' } }
	const button = (saveVariant) => mount(CnRecordNotesWidget, {
		props: { objectData: record, content: content(saveVariant) },
		global: { provide: { cnTranslate: (key) => key }, stubs: { NcButton: { props: ['variant'], template: '<button :data-variant="variant"><slot /></button>' } } },
	}).find('[data-testid="cn-record-notes-outcome-save"]')

	it('is secondary by default', () => {
		expect(button(undefined).attributes('data-variant')).toBe('secondary')
	})

	it('takes outcome.saveVariant primary', () => {
		expect(button('primary').attributes('data-variant')).toBe('primary')
	})
})

describe('manifest schema', () => {
	it('accepts afterTitle on a what-now stage', () => {
		const { validateManifestV2 } = require('../../src/utils/validateManifest.js')
		const manifest = {
			$schema: 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json',
			version: '0.1.0',
			menu: [],
			pages: [{ id: 'P', route: '/p/:id', type: 'detail', title: 'P', config: { register: 'r', schema: 's', nextStep: { stages: { new: { afterTitle: 'A statement.', after: 'A line.', checklist: [{ label: 'x' }] } } } } }],
		}
		const result = validateManifestV2(manifest)
		expect(result.errors || []).toEqual([])
		expect(result.valid).toBe(true)
	})
})
