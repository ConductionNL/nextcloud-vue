/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A readiness list: each thing an instance needs, its state in words, an
 * explanation and a link to the screen that fixes it (dossiq's first run and
 * prerequisites tabs).
 *
 * @spec openspec/changes/readiness-checklist/specs/readiness-checklist/spec.md
 */
var mockGet = jest.fn()
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: (...a) => mockGet(...a) } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (url) => `/index.php${url}` }))

import { flushPromises, mount } from '@vue/test-utils'
import CnReadinessChecklist from '../../src/components/CnReadinessChecklist/CnReadinessChecklist.vue'

beforeEach(() => mockGet.mockReset())

describe('CnReadinessChecklist', () => {
	it('says each state in a word and links the fix', () => {
		const w = mount(CnReadinessChecklist, {
			props: {
				items: [
					{ id: 'register', label: 'Register', explanation: 'Holds the cases.', met: true },
					{ id: 'mail', label: 'Mailbox', explanation: 'Mail becomes cases.', met: false, fixHref: '/settings/mail' },
					{ id: 'odd', label: 'Something', met: null, failure: 'timeout' },
				],
			},
		})
		const states = w.findAll('[data-testid="cn-readiness-item-state"]').map((s) => s.text())
		expect(states).toEqual(['Done', 'Still open', 'Unknown'])
		expect(w.find('[data-testid="cn-readiness-item-mail"] a').attributes('href')).toBe('/settings/mail')
		expect(w.find('[data-testid="cn-readiness-item-register"] a').exists()).toBe(false)
		expect(w.find('[data-testid="cn-readiness-item-odd"]').text()).toContain('This could not be read: timeout')
	})

	it('reads a source through a field map and hands the answer on', async () => {
		mockGet.mockResolvedValue({ data: { readiness: [{ id: 'r', title: 'Register', body: 'Why', done: true, screen: '/x' }], tourSteps: [] } })
		const w = mount(CnReadinessChecklist, {
			props: { source: '/apps/app/api/setup/status', itemsPath: 'readiness', fields: { label: 'title', explanation: 'body', met: 'done', fixHref: 'screen' } },
		})
		await flushPromises()
		expect(mockGet).toHaveBeenCalledWith('/index.php/apps/app/api/setup/status')
		expect(w.find('[data-testid="cn-readiness-item-r"]').text()).toContain('Why')
		expect(w.find('[data-testid="cn-readiness-item-state"]').text()).toBe('Done')
		expect(w.emitted('loaded')[0][0].tourSteps).toEqual([])
	})

	it('says a failed read rather than showing an empty list', async () => {
		mockGet.mockRejectedValue(new Error('500'))
		const w = mount(CnReadinessChecklist, { props: { source: '/apps/app/api/setup/status', errorText: 'The status could not be read.' } })
		await flushPromises()
		expect(w.find('[data-testid="cn-readiness-checklist-error"]').text()).toBe('The status could not be read.')
	})

	it('groups items under headings, names the blocking ones and takes its own words', () => {
		const w = mount(CnReadinessChecklist, {
			props: {
				groups: [{ id: 'apps', title: 'Apps' }, { id: 'php', title: 'PHP extensions' }],
				statusLabels: { met: 'present', unmet: 'missing' },
				blockingText: 'Cannot run until this is installed:',
				items: [
					{ id: 'gd', label: 'gd', met: true, group: 'php' },
					{ id: 'openregister', label: 'Open Register', met: false, group: 'apps', blocking: true },
				],
			},
			global: { provide: { cnTranslate: (key) => key } },
		})
		expect(w.findAll('h4').map((h) => h.text())).toEqual(['Apps', 'PHP extensions'])
		expect(w.find('[data-testid="cn-readiness-checklist-blocking"]').text()).toBe('Cannot run until this is installed: Open Register')
		expect(w.findAll('[data-testid="cn-readiness-item-state"]').map((s) => s.text())).toEqual(['missing', 'present'])
	})
})
