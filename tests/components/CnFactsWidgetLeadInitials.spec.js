/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A lead with initials stands for a person and is drawn round, as an avatar
 * is (DqZaak "Aanvrager"); a lead with an icon keeps the square tile
 * (DqOrganisatie "KvK en adres").
 */
import { mount } from '@vue/test-utils'
import fs from 'fs'
import path from 'path'
import CnFactsWidget from '../../src/components/CnFactsWidget/CnFactsWidget.vue'

jest.mock('@nextcloud/event-bus', () => ({ __esModule: true, emit: jest.fn(), subscribe: jest.fn(), unsubscribe: jest.fn() }))

const source = fs.readFileSync(path.join(__dirname, '../../src/components/CnFactsWidget/CnFactsWidget.vue'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

function mountLeads() {
	return mount(CnFactsWidget, {
		props: {
			content: { fields: [
				{ as: 'lead', key: 'person', initialsPath: 'name', title: 'name' },
				{ as: 'lead', key: 'org', icon: 'OfficeBuildingOutline', title: 'kvkNumber' },
			] },
			objectData: { id: 'p-1', name: 'Sanne de Vries', kvkNumber: '40481234' },
			objectId: 'p-1',
		},
		global: {
			provide: { cnTranslate: (key) => key },
			stubs: { CnIcon: { props: ['name'], template: '<i class="icon" :data-name="name" />' } },
		},
	})
}

describe('CnFactsWidget: lead tile shape', () => {
	it('marks a lead with initials, not one with an icon', () => {
		const w = mountLeads()
		expect(w.find('[data-testid="cn-fact-person"] .cn-facts-widget__lead-tile').classes()).toContain('cn-facts-widget__lead-tile--initials')
		expect(w.find('[data-testid="cn-fact-org"] .cn-facts-widget__lead-tile').classes()).not.toContain('cn-facts-widget__lead-tile--initials')
	})

	it('draws the initials tile round', () => {
		const at = source.indexOf('.cn-facts-widget__lead-tile--initials {')
		expect(at).toBeGreaterThan(-1)
		expect(source.slice(at, source.indexOf('}', at))).toContain('border-radius: 50%')
	})
})
