/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqTenant "Beheerder": the administrator as a person chip, a 28px round
 * tile with the initials of the name beside it, 8px apart, the name in the
 * normal weight. A lead takes `size` for the tile and `initialsFrom: "title"`
 * to take the initials from the name it shows (a user id has none of its own).
 *
 * @spec openspec/changes/facts-lead-person-chip/specs/facts-widget/spec.md
 */
import { mount } from '@vue/test-utils'
import fs from 'fs'
import path from 'path'
import CnFactsWidget from '../../src/components/CnFactsWidget/CnFactsWidget.vue'

jest.mock('@nextcloud/event-bus', () => ({ __esModule: true, emit: jest.fn(), subscribe: jest.fn(), unsubscribe: jest.fn() }))

const source = fs.readFileSync(path.join(__dirname, '../../src/components/CnFactsWidget/CnFactsWidget.vue'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

function mountLead(field) {
	return mount(CnFactsWidget, {
		props: {
			content: { fields: [{ as: 'lead', key: 'admin', title: 'name', ...field }] },
			objectData: { id: 'u-1', name: 'Marieke Visser' },
			objectId: 'u-1',
		},
		global: { provide: { cnTranslate: (key) => key } },
	})
}

describe('CnFactsWidget: a lead as a person chip', () => {
	it('takes the initials from the name it shows', () => {
		const w = mountLead({ initialsFrom: 'title', size: 28, tone: 'info' })
		expect(w.find('[data-testid="cn-fact-admin"] .cn-facts-widget__lead-tile').text()).toBe('MV')
		expect(w.find('[data-testid="cn-fact-admin"] .cn-facts-widget__lead-title').text()).toBe('Marieke Visser')
	})

	it('tones the tile teal', () => {
		const w = mountLead({ initialsFrom: 'title', size: 28, tone: 'teal' })
		expect(w.find('[data-testid="cn-fact-admin"] .cn-facts-widget__lead-tile').classes()).toContain('cn-facts-widget__lead-tile--teal')
	})

	it('draws a tile under 32px as a person chip', () => {
		const w = mountLead({ initialsFrom: 'title', size: 28 })
		const lead = w.find('[data-testid="cn-fact-admin"]')
		expect(lead.classes()).toContain('cn-facts-widget__lead--chip')
		expect(lead.find('.cn-facts-widget__lead-tile').attributes('style')).toContain('--cn-facts-lead-tile-size: 28px')
		const at = source.indexOf('.cn-facts-widget__lead--chip .cn-facts-widget__lead-title {')
		expect(at).toBeGreaterThan(-1)
		expect(source.slice(at, source.indexOf('}', at))).toContain('font-weight: 400')
	})

	it('keeps the 40px tile and no initials without the options', () => {
		const w = mountLead({})
		const lead = w.find('[data-testid="cn-fact-admin"]')
		expect(lead.classes()).not.toContain('cn-facts-widget__lead--chip')
		expect(lead.find('.cn-facts-widget__lead-tile').text()).toBe('')
	})
})
