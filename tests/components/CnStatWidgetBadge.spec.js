/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnStatWidget: badge display mode, the colour from the resolved row, the
 * empty text and the record-driven override.
 *
 * The concrete need is dossiq's case page. Its status tile shows the case's
 * status as a pill, coloured by whether that status is final, "Unknown" when
 * the status does not resolve, and "Suspended" in a warning colour while the
 * case is suspended, whatever its status says.
 */
import { mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import CnStatWidget from '../../src/components/CnStatWidget/CnStatWidget.vue'
import CnStatusBadge from '../../src/components/CnStatusBadge/CnStatusBadge.vue'

/**
 * Drain the watcher, store lookup and re-render chain.
 *
 * @return {Promise<void>} Resolves once the queue is drained.
 */
async function flush() {
	for (let i = 0; i < 10; i++) {
		await Promise.resolve()
		await nextTick()
	}
}

/**
 * Mount the tile on a detail page bound to `record`.
 *
 * @param {object} content The tile config.
 * @param {object|null} record The bound record.
 * @return {object} The wrapper.
 */
function mountTile(content, record) {
	return mount(CnStatWidget, {
		props: { content },
		global: {
			provide: {
				cnObjectContext: ref({ objectId: 'case-1', object: record, register: 'dossiq', schema: 'case' }),
			},
		},
	})
}

/**
 * Mock the store's single-object read with a status row.
 *
 * @param {object} row The row the lookup answers with.
 * @return {object} The jest spy.
 */
function answerWith(row) {
	return jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true, json: async () => row })
}

const variantOf = (wrapper) => ['default', 'primary', 'success', 'warning', 'error', 'info']
	.find((v) => wrapper.find('.cn-status-badge--' + v).exists())

const statusTile = (extra = {}) => ({
	label: 'Status',
	display: 'badge',
	objectField: {
		field: 'status',
		resolve: {
			register: 'dossiq',
			schema: 'statusType',
			labelField: 'name',
			variantField: 'isFinal',
			variantMap: { true: 'success', false: 'info' },
		},
	},
	...extra,
})

afterEach(() => {
	jest.restoreAllMocks()
})

describe('CnStatWidget: badge display mode', () => {
	it('renders the value as a CnStatusBadge instead of plain text', () => {
		const w = mountTile({ display: 'badge', objectField: 'priority' }, { priority: 'High' })

		const badge = w.findComponent(CnStatusBadge)
		expect(badge.exists()).toBe(true)
		expect(badge.text()).toBe('High')
		expect(w.find('.cn-stat-widget__value').exists()).toBe(false)
	})

	it('keeps the plain value when display is not set', () => {
		const w = mountTile({ objectField: 'priority' }, { priority: 'High' })

		expect(w.findComponent(CnStatusBadge).exists()).toBe(false)
		expect(w.find('.cn-stat-widget__value').text()).toBe('High')
	})

	it('colours the badge from variantWhen, like the text mode does', () => {
		const w = mountTile({
			display: 'badge',
			objectField: 'priority',
			variantWhen: [{ op: 'eq', value: 'High', variant: 'danger' }],
		}, { priority: 'High' })

		// `danger` is the doriath alias of `error`; the badge only knows `error`.
		expect(variantOf(w)).toBe('error')
	})

	it('uses the static variant as its resting colour', () => {
		const w = mountTile({ display: 'badge', objectField: 'priority', variant: 'primary' }, { priority: 'Low' })
		expect(variantOf(w)).toBe('primary')
	})

	it('falls back to the default variant', () => {
		const w = mountTile({ display: 'badge', objectField: 'priority' }, { priority: 'Low' })
		expect(variantOf(w)).toBe('default')
	})
})

describe('CnStatWidget: variant from the resolved row', () => {
	it('colours the badge from a field on the looked-up row, through variantMap', async () => {
		answerWith({ id: 'st-final', name: 'Afgehandeld', isFinal: true })
		const w = mountTile(statusTile(), { status: 'st-final' })
		await flush()

		expect(w.findComponent(CnStatusBadge).text()).toBe('Afgehandeld')
		expect(variantOf(w)).toBe('success')
	})

	it('maps the other row value to its own variant', async () => {
		answerWith({ id: 'st-open', name: 'In behandeling', isFinal: false })
		const w = mountTile(statusTile(), { status: 'st-open' })
		await flush()

		expect(w.findComponent(CnStatusBadge).text()).toBe('In behandeling')
		expect(variantOf(w)).toBe('info')
	})

	it('reads the row value as the variant itself when no map is given', async () => {
		answerWith({ id: 'st-1', name: 'Wacht op klant', tone: 'warning' })
		const w = mountTile({
			display: 'badge',
			objectField: { field: 'status', resolve: { register: 'dossiq', schema: 'statusType', variantField: 'tone' } },
		}, { status: 'st-1' })
		await flush()

		expect(variantOf(w)).toBe('warning')
	})

	it('ignores a row value the map does not name', async () => {
		answerWith({ id: 'st-2', name: 'Onbekend', isFinal: 'maybe' })
		const w = mountTile(statusTile(), { status: 'st-2' })
		await flush()

		expect(variantOf(w)).toBe('default')
	})

	it('lets a variantWhen rule on the shown text outrank the row', async () => {
		answerWith({ id: 'st-final', name: 'Afgehandeld', isFinal: true })
		const w = mountTile(statusTile({
			variantWhen: [{ op: 'eq', value: 'Afgehandeld', variant: 'primary' }],
		}), { status: 'st-final' })
		await flush()

		expect(variantOf(w)).toBe('primary')
	})
})

describe('CnStatWidget: emptyText', () => {
	it('shows emptyText instead of the dash for an empty value', () => {
		const w = mountTile({ objectField: 'status', emptyText: 'Unknown' }, { status: null })

		expect(w.text()).toContain('Unknown')
		expect(w.text()).not.toContain('—')
	})

	it('shows emptyText in the badge too', () => {
		const w = mountTile({ display: 'badge', objectField: 'status', emptyText: 'Unknown' }, { status: '' })
		expect(w.findComponent(CnStatusBadge).text()).toBe('Unknown')
	})

	it('keeps the dash when no emptyText is configured', () => {
		const w = mountTile({ objectField: 'status' }, { status: null })
		expect(w.text()).toContain('—')
	})

	it('shows emptyText rather than a raw uuid when the reference does not resolve', async () => {
		jest.spyOn(global, 'fetch').mockRejectedValue(new Error('gone'))
		const w = mountTile(statusTile({ emptyText: 'Unknown' }), { status: 'st-deleted' })
		await flush()

		expect(w.findComponent(CnStatusBadge).text()).toBe('Unknown')
		expect(w.text()).not.toContain('st-deleted')
	})

	it('keeps the raw value on a failed lookup when no emptyText is configured', async () => {
		jest.spyOn(global, 'fetch').mockRejectedValue(new Error('gone'))
		const w = mountTile(statusTile(), { status: 'st-deleted' })
		await flush()

		expect(w.findComponent(CnStatusBadge).text()).toBe('st-deleted')
	})

	it('translates emptyText', () => {
		const w = mount(CnStatWidget, {
			props: { content: { objectField: 'status', emptyText: 'Unknown' }, translate: (s) => (s === 'Unknown' ? 'Onbekend' : s) },
			global: { provide: { cnObjectContext: ref({ objectId: 'x', object: { status: null } }) } },
		})
		expect(w.text()).toContain('Onbekend')
	})
})

describe('CnStatWidget: record-driven override', () => {
	const suspended = { when: { field: 'suspended' }, label: 'Suspended', variant: 'warning' }

	it('shows a suspended case as "Suspended" in the warning colour', async () => {
		answerWith({ id: 'st-open', name: 'In behandeling', isFinal: false })
		const w = mountTile(statusTile({ overrides: [suspended] }), { status: 'st-open', suspended: true })
		await flush()

		expect(w.findComponent(CnStatusBadge).text()).toBe('Suspended')
		expect(variantOf(w)).toBe('warning')
	})

	it('leaves a case that is not suspended on its status', async () => {
		answerWith({ id: 'st-open', name: 'In behandeling', isFinal: false })
		const w = mountTile(statusTile({ overrides: [suspended] }), { status: 'st-open', suspended: false })
		await flush()

		expect(w.findComponent(CnStatusBadge).text()).toBe('In behandeling')
		expect(variantOf(w)).toBe('info')
	})

	it('outranks emptyText, so a suspended case with no status still reads as suspended', () => {
		const w = mountTile(statusTile({ emptyText: 'Unknown', overrides: [suspended] }), { status: null, suspended: true })
		expect(w.findComponent(CnStatusBadge).text()).toBe('Suspended')
	})

	it('accepts the visibleWhen comparison grammar', () => {
		const w = mountTile({
			display: 'badge',
			objectField: 'phase',
			overrides: [{ when: { field: 'state', op: 'eq', value: 'paused' }, label: 'Paused', variant: 'warning' }],
		}, { phase: 'Review', state: 'paused' })

		expect(w.findComponent(CnStatusBadge).text()).toBe('Paused')
	})

	it('uses the first override that matches', () => {
		const w = mountTile({
			display: 'badge',
			objectField: 'phase',
			overrides: [
				{ when: { field: 'onHold' }, label: 'On hold', variant: 'error' },
				{ when: { field: 'suspended' }, label: 'Suspended', variant: 'warning' },
			],
		}, { phase: 'Review', onHold: true, suspended: true })

		expect(w.findComponent(CnStatusBadge).text()).toBe('On hold')
		expect(variantOf(w)).toBe('error')
	})

	it('recolours the plain text value too', () => {
		const w = mountTile({ objectField: 'phase', overrides: [suspended] }, { phase: 'Review', suspended: true })

		const value = w.find('.cn-stat-widget__value')
		expect(value.text()).toBe('Suspended')
		// jsdom drops `var()` colours from the style attribute, so the bound
		// style object is asserted, as CnStatWidgetVariantContrast does.
		expect(w.vm.valueStyle.color).toContain('--color-warning-text')
	})

	it('replaces the icon when the override names one', () => {
		const w = mountTile({
			objectField: 'phase',
			icon: 'Cash',
			overrides: [{ ...suspended, icon: 'PauseCircleOutline' }],
		}, { phase: 'Review', suspended: true })

		expect(w.vm.resolvedIcon).toBe('PauseCircleOutline')
	})

	it('applies nothing without a bound record', () => {
		const w = mount(CnStatWidget, {
			props: { content: { display: 'badge', label: 'x', overrides: [suspended] } },
		})
		expect(w.vm.activeOverride).toBeNull()
	})
})
