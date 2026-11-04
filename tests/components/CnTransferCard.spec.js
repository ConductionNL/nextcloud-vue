/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnTransferCard: how far a long transfer is, its parts, and resuming.
 *
 * @spec openspec/changes/transfer-card/specs/transfer-card/spec.md
 */
import { mount } from '@vue/test-utils'
import CnTransferCard from '../../src/components/CnTransferCard/CnTransferCard.vue'

const stubs = {
	NcProgressBar: { name: 'NcProgressBar', props: ['value'], template: '<div class="bar" />' },
	NcButton: { name: 'NcButton', emits: ['click'], template: '<button @click="$emit(\'click\')"><slot /></button>' },
}

function mountCard(props = {}, slots = {}) {
	return mount(CnTransferCard, {
		props: { title: 'Sync', done: 32, total: 48, unit: 'MB', remainingText: 'about 6 minutes left', ...props },
		slots,
		global: { stubs },
	})
}

const percent = (w) => w.findComponent({ name: 'NcProgressBar' }).props('value')

describe('CnTransferCard', () => {
	it('reads the amount in words and names the bar with them', () => {
		const w = mountCard()
		expect(w.find('[data-testid="cn-transfer-amount"]').text()).toBe('32 MB of 48 MB')
		expect(w.find('[data-testid="cn-transfer-bar"]').attributes('aria-label')).toBe('32 MB of 48 MB')
		expect(percent(w)).toBe(67)
	})

	it('reads the amount from its template', () => {
		const w = mountCard({ amountTemplate: '{done} {unit} van {total} {unit} gedownload' })
		expect(w.find('[data-testid="cn-transfer-amount"]').text()).toBe('32 MB van 48 MB gedownload')
	})

	it('keeps the bar between 0 and 100, and at 0 with no total', () => {
		expect(percent(mountCard({ total: 0 }))).toBe(0)
		expect(percent(mountCard({ done: 60 }))).toBe(100)
		expect(percent(mountCard({ done: -5 }))).toBe(0)
	})

	it('shows each part with its state', () => {
		const w = mountCard({ items: [{ id: 'a', label: 'Cases', state: 'Done' }, { label: 'Map', state: 'Busy' }] })
		expect(w.findAll('[data-testid="cn-transfer-item"]').map((i) => i.text())).toEqual(['CasesDone', 'MapBusy'])
	})

	it('offers no resume and shows the time left while running', () => {
		const w = mountCard()
		expect(w.find('[data-testid="cn-transfer-resume"]').exists()).toBe(false)
		expect(w.find('[data-testid="cn-transfer-remaining"]').text()).toBe('about 6 minutes left')
	})

	it('says it paused, hides the time left and emits resume', async () => {
		const w = mountCard({ paused: true })
		expect(w.find('[data-testid="cn-transfer-paused"]').attributes('role')).toBe('status')
		expect(w.find('[data-testid="cn-transfer-remaining"]').exists()).toBe(false)
		await w.find('[data-testid="cn-transfer-resume"]').trigger('click')
		expect(w.emitted('resume')).toHaveLength(1)
	})

	it('draws the actions slot and the note', () => {
		const w = mountCard({ note: 'Stays for 24 hours.' }, { actions: '<button class="more">Add</button>' })
		expect(w.find('.more').exists()).toBe(true)
		expect(w.find('[data-testid="cn-transfer-note"]').text()).toBe('Stays for 24 hours.')
	})
})
