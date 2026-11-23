/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * PqJourney "Geschiedenis": a dated audit list puts the short date ("2 okt")
 * beside what happened, one line per entry, as a two-column list.
 *
 * @spec openspec/changes/audit-card-dated-layout/specs/audit-trail/spec.md#requirement-an-audit-list-can-put-the-date-beside-what-happened
 */
jest.mock('../../src/utils/userDisplayName.js', () => ({ userDisplayName: (id) => ({ pieter: 'Pieter Jansen' })[id] || '' }))

const { mount, flushPromises } = require('@vue/test-utils')
const { readFileSync } = require('node:fs')
const { resolve } = require('node:path')
const CnAuditTrailCard = require('../../src/components/CnAuditTrailCard/CnAuditTrailCard.vue').default

const year = new Date().getFullYear()

function mountCard(layout) {
	global.fetch = jest.fn().mockResolvedValueOnce({
		ok: true,
		json: () => Promise.resolve({
			results: [
				{ id: '2', action: 'activate', actor: 'pieter', creationDateTime: `${year}-10-02T10:07:00` },
				{ id: '1', action: 'create', actor: 'pieter', creationDateTime: `${year}-09-30T14:20:00` },
			],
		}),
	})
	return mount(CnAuditTrailCard, {
		propsData: { register: 'r', schema: 's', objectId: 'o', layout, actionLabels: { activate: 'Activated by {actor}', create: 'Created' } },
	})
}

describe('CnAuditTrailCard dated list', () => {
	it('puts the short date beside what happened', async () => {
		const w = mountCard('dated')
		await flushPromises()
		const list = w.find('dl.cn-audit-card__dated')
		expect(list.exists()).toBe(true)
		const dates = list.findAll('dt').map((d) => d.text())
		const texts = list.findAll('dd').map((d) => d.text())
		expect(dates).toHaveLength(2)
		expect(dates[0]).toMatch(/\b2\b/)
		expect(dates[0]).not.toMatch(/:/)
		expect(texts).toEqual(['Activated by Pieter Jansen', 'Created'])
		expect(w.find('ul.cn-audit-card__list').exists()).toBe(false)
		w.unmount()
	})

	it('keeps the list of rows without the layout', async () => {
		const w = mountCard('')
		await flushPromises()
		expect(w.find('dl.cn-audit-card__dated').exists()).toBe(false)
		expect(w.find('ul.cn-audit-card__list').exists()).toBe(true)
		w.unmount()
	})

	it('lays the dates out in their own column', () => {
		const source = readFileSync(resolve(__dirname, '../../src/components/CnAuditTrailCard/CnAuditTrailCard.vue'), 'utf8')
		expect(source).toMatch(/\.cn-audit-card__dated \{[^}]*grid-template-columns: max-content (minmax\(0, )?1fr\)?/)
	})
})
