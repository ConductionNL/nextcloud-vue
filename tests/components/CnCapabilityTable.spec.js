/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * CnCapabilityTable — the rendered half of the capability comparison: the
 * search box, the grouping toggle, the provided-by column, the low-confidence
 * marker, and the table semantics a screen reader needs to survive a filter.
 */

import { mount } from '@vue/test-utils'
import CnCapabilityTable from '../../src/components/CnCapabilityTable/CnCapabilityTable.vue'

const stubs = {
	NcButton: {
		name: 'NcButton',
		emits: ['click'],
		props: ['variant'],
		template: '<button class="btn" :data-variant="variant" @click="$emit(\'click\')"><slot /></button>',
	},
	NcEmptyContent: {
		name: 'NcEmptyContent',
		props: ['name', 'description'],
		template: '<div class="empty"><h2>{{ name }}</h2><p>{{ description }}</p></div>',
	},
	NcTextField: {
		name: 'NcTextField',
		emits: ['update:modelValue', 'trailingButtonClick'],
		props: ['modelValue', 'label', 'placeholder', 'trailingButtonLabel'],
		template: '<input class="text-field" :value="modelValue" :aria-label="label" @input="$emit(\'update:modelValue\', $event.target.value)">',
	},
	Magnify: true,
}

/**
 * A document carrying every optional field the contract adds.
 *
 * @return {object} The document.
 */
function fullDocument() {
	return {
		systems: [
			{ key: 'dossiq', name: 'Dossiq', isSelf: true },
			{ key: 'opencase', name: 'OpenCase' },
		],
		areas: [
			{ key: 'intake', name: 'Intake' },
			{ key: 'documents', name: 'Documents' },
		],
		features: [
			{ key: 'case-types', name: 'Case types' },
			{ key: 'filing', name: 'Filing' },
		],
		providers: [
			{ key: 'dossiq', name: 'Dossiq', kind: 'self' },
			{ key: 'openregister', name: 'OpenRegister', kind: 'app' },
			{ key: 'nextcloud', name: 'Nextcloud', kind: 'platform' },
		],
		capabilities: [
			{ id: '1.1', area: 'intake', name: 'Citizen web form', dossiq: 'partial', opencase: 'no', provider: 'dossiq', feature: 'case-types', featureConfidence: 'high' },
			{ id: '4.1', area: 'documents', name: 'Versioned documents', dossiq: 'yes', opencase: 'yes', provider: 'nextcloud', feature: 'filing', featureConfidence: 'low' },
			{ id: '4.2', area: 'documents', name: 'Retention schedule', dossiq: 'yes', opencase: 'unknown', provider: 'openregister', feature: 'filing' },
		],
	}
}

/**
 * The document a consumer has today: ratings and areas, nothing more.
 *
 * @return {object} The document.
 */
function legacyDocument() {
	return {
		systems: [{ key: 'dossiq', name: 'Dossiq', isSelf: true }],
		areas: [{ key: 'intake', name: 'Intake' }],
		capabilities: [
			{ id: '1.1', area: 'intake', name: 'Citizen web form', dossiq: 'partial' },
			{ id: '1.2', area: 'intake', name: 'Upload an attachment', dossiq: 'yes' },
		],
	}
}

/**
 * Mount the table over a document.
 *
 * @param {object} comparison The comparison document.
 * @param {object} [props] Extra props.
 * @return {object} The wrapper.
 */
function mountTable(comparison, props = {}) {
	return mount(CnCapabilityTable, { stubs, propsData: { comparison, ...props } })
}

/**
 * Type into the search box and wait out the 200 ms debounce.
 *
 * @param {object} wrapper The mounted table.
 * @param {string} value What the reader typed.
 */
async function search(wrapper, value) {
	wrapper.find('input.text-field').element.value = value
	await wrapper.find('input.text-field').trigger('input')
	jest.advanceTimersByTime(250)
	await wrapper.vm.$nextTick()
}

const rowIds = (wrapper) => wrapper.findAll('tbody tr td.cn-capability-table__num').map((cell) => cell.text())

describe('CnCapabilityTable', () => {
	beforeEach(() => {
		jest.useFakeTimers()
	})

	afterEach(() => {
		jest.useRealTimers()
	})

	describe('the search box', () => {
		it('carries a real label rather than a bare placeholder', () => {
			const wrapper = mountTable(fullDocument())
			expect(wrapper.findComponent({ name: 'NcTextField' }).props('label')).toBe('Search capabilities')
		})

		it('keeps only the matching rows once the debounce settles', async () => {
			const wrapper = mountTable(fullDocument())
			expect(rowIds(wrapper)).toEqual(['1.1', '4.1', '4.2'])
			await search(wrapper, 'retention')
			expect(rowIds(wrapper)).toEqual(['4.2'])
		})

		it('holds the old rows until the debounce settles', async () => {
			const wrapper = mountTable(fullDocument())
			wrapper.find('input.text-field').element.value = 'retention'
			await wrapper.find('input.text-field').trigger('input')
			jest.advanceTimersByTime(100)
			await wrapper.vm.$nextTick()
			expect(rowIds(wrapper)).toEqual(['1.1', '4.1', '4.2'])
		})

		it('matches the provider name, which is a column and not just a chip', async () => {
			const wrapper = mountTable(fullDocument())
			await search(wrapper, 'openregister')
			expect(rowIds(wrapper)).toEqual(['4.2'])
		})

		it('ignores accents so a plain query finds an accented row', async () => {
			const document = fullDocument()
			document.capabilities[0].name = 'Eén formulier'
			const wrapper = mountTable(document)
			await search(wrapper, 'een')
			expect(rowIds(wrapper)).toEqual(['1.1'])
		})

		it('tells the reader how many rows they are seeing', async () => {
			const wrapper = mountTable(fullDocument())
			expect(wrapper.find('.cn-capability-table__count').text()).toBe('You see 3 capabilities of 3.')
			await search(wrapper, 'retention')
			expect(wrapper.find('.cn-capability-table__count').text()).toBe('You see 1 capability of 3.')
		})

		it('names what was searched for when nothing matches', async () => {
			const wrapper = mountTable(fullDocument())
			await search(wrapper, 'zzzz')
			const empty = wrapper.findComponent({ name: 'NcEmptyContent' })
			expect(empty.props('name')).toBe('No capability matches zzzz')
			expect(empty.props('description')).toBe('Clear the search box or try another word.')
		})

		/*
		 * 🔴 `t()` escapes its placeholders by default, and this line is read
		 * through `{{ }}`, which escapes nothing further — it just shows what it
		 * was handed. So the reader got their own query back as `a &amp; b`.
		 * The test above passes over it because `zzzz` has nothing to escape,
		 * which is the shape of every such bug.
		 */
		it('gives the reader their query back as they typed it', async () => {
			const wrapper = mountTable(fullDocument())
			await search(wrapper, 'zaken & dossiers')
			expect(wrapper.findComponent({ name: 'NcEmptyContent' }).props('name'))
				.toBe('No capability matches zaken & dossiers')
		})

		it('brings every row back when the reader clears the box', async () => {
			const wrapper = mountTable(fullDocument())
			await search(wrapper, 'retention')
			wrapper.findComponent({ name: 'NcTextField' }).vm.$emit('trailingButtonClick')
			await wrapper.vm.$nextTick()
			expect(rowIds(wrapper)).toEqual(['1.1', '4.1', '4.2'])
		})
	})

	describe('the grouping toggle', () => {
		it('opens on features when the document maps any', () => {
			const wrapper = mountTable(fullDocument())
			expect(wrapper.findAll('.cn-capability-table__group-title').map((h) => h.text())).toEqual([
				'Case types 1',
				'Filing 2',
			])
		})

		it('switches to areas when the reader asks for them', async () => {
			const wrapper = mountTable(fullDocument())
			await wrapper.findAll('.cn-capability-table__group-button').at(1).trigger('click')
			expect(wrapper.findAll('.cn-capability-table__group-title').map((h) => h.text())).toEqual([
				'Intake 1',
				'Documents 2',
			])
		})

		it('marks the active grouping with aria-pressed, not colour alone', async () => {
			const wrapper = mountTable(fullDocument())
			const buttons = wrapper.findAll('.cn-capability-table__group-button')
			expect(buttons.at(0).attributes('aria-pressed')).toBe('true')
			expect(buttons.at(1).attributes('aria-pressed')).toBe('false')
			await buttons.at(1).trigger('click')
			expect(wrapper.findAll('.cn-capability-table__group-button').at(1).attributes('aria-pressed')).toBe('true')
		})

		it('hides the toggle on a document that maps no feature, and groups by area', () => {
			const wrapper = mountTable(legacyDocument())
			expect(wrapper.findAll('.cn-capability-table__group-button')).toHaveLength(0)
			expect(wrapper.findAll('.cn-capability-table__group-title').map((h) => h.text())).toEqual(['Intake 2'])
		})

		it('hides the toggle for a groupBy that locks the grouping', () => {
			const wrapper = mountTable(fullDocument(), { groupBy: 'area' })
			expect(wrapper.findAll('.cn-capability-table__group-button')).toHaveLength(0)
			expect(wrapper.vm.groupMode).toBe('area')
		})

		/*
		 * 🔴 `groupingAvailable` tested the raw prop for emptiness while
		 * `groupMode` tested it against the two names it accepts, so a value
		 * neither recognises — a plural, a typo — took the toggle away and then
		 * grouped by the default anyway. The reader lost the control and got no
		 * sign that the prop was wrong.
		 */
		it('keeps the toggle for a groupBy naming neither grouping', () => {
			const wrapper = mountTable(fullDocument(), { groupBy: 'areas' })
			expect(wrapper.findAll('.cn-capability-table__group-button')).toHaveLength(2)
			expect(wrapper.vm.groupMode).toBe('feature')
		})

		it('shows a row with no feature under a heading that says so', () => {
			const document = fullDocument()
			document.capabilities.push({ id: '9.9', area: 'intake', name: 'Orphan', dossiq: 'no' })
			const wrapper = mountTable(document)
			const titles = wrapper.findAll('.cn-capability-table__group-title').map((h) => h.text())
			expect(titles).toContain('Not yet mapped to a feature 1')
			expect(rowIds(wrapper)).toContain('9.9')
		})
	})

	describe('the provided-by column', () => {
		it('names the provider and which of the three kinds it is', () => {
			const wrapper = mountTable(fullDocument())
			const names = wrapper.findAll('.cn-capability-table__provider-name').map((cell) => cell.text())
			const kinds = wrapper.findAll('.cn-capability-table__provider-kind').map((cell) => cell.text())
			expect(names).toEqual(['Dossiq', 'Nextcloud', 'OpenRegister'])
			expect(kinds).toEqual(['this app', 'the platform', 'another app'])
		})

		it('distinguishes the three kinds by class as well as by word', () => {
			const wrapper = mountTable(fullDocument())
			const classes = wrapper.findAll('.cn-capability-table__provider').map((cell) => cell.attributes('class'))
			expect(classes[0]).toContain('cn-capability-table__provider--self')
			expect(classes[1]).toContain('cn-capability-table__provider--platform')
			expect(classes[2]).toContain('cn-capability-table__provider--app')
		})

		it('keeps the row and shows the raw key for a provider nobody declared', () => {
			const document = fullDocument()
			document.capabilities[0].provider = 'thematiq'
			const wrapper = mountTable(document)
			expect(rowIds(wrapper)).toEqual(['1.1', '4.1', '4.2'])
			expect(wrapper.findAll('.cn-capability-table__provider-name').at(0).text()).toBe('thematiq')
			expect(wrapper.findAll('.cn-capability-table__provider-kind')).toHaveLength(2)
		})

		it('shows the mechanism the document names rather than dropping the field', () => {
			const document = fullDocument()
			document.capabilities[2].providerHow = 'ledger-change'
			const wrapper = mountTable(document)
			const hows = wrapper.findAll('.cn-capability-table__provider-how').map((cell) => cell.text())
			expect(hows).toEqual(['ledger-change'])
		})

		it('leaves the column out entirely for a document that names no provider', () => {
			const wrapper = mountTable(legacyDocument())
			const headers = wrapper.findAll('thead th').map((cell) => cell.text())
			expect(headers).not.toContain('Provided by')
			expect(headers).toEqual(['No.', 'Capability', 'Dossiq'])
		})
	})

	describe('the low-confidence marker', () => {
		it('marks the judged row and leaves the others alone', () => {
			const wrapper = mountTable(fullDocument())
			const marks = wrapper.findAll('.cn-capability-table__confidence')
			expect(marks).toHaveLength(1)
			expect(marks.at(0).attributes('title')).toBe('We matched this row to its feature by judgement.')
		})

		it('reaches a screen reader as words, not as a bare question mark', () => {
			const wrapper = mountTable(fullDocument())
			expect(wrapper.find('.cn-capability-table__confidence .cn-capability-table__sr-only').text())
				.toBe('We matched this row to its feature by judgement.')
		})

		it('keeps the judged row on the page rather than hiding it', () => {
			expect(rowIds(mountTable(fullDocument()))).toContain('4.1')
		})
	})

	describe('table semantics', () => {
		it('keeps every group a real table with a caption and column headers', () => {
			const wrapper = mountTable(fullDocument())
			const tables = wrapper.findAll('table')
			expect(tables).toHaveLength(2)
			expect(tables.at(0).find('caption').text()).toBe('Capabilities in Case types, rated per system.')
			expect(tables.at(0).findAll('thead th[scope="col"]').length).toBe(5)
			expect(tables.at(0).findAll('tbody th[scope="row"]').length).toBe(1)
		})

		/*
		 * 🔴 The same escaping as the empty state, and worse placed: a caption
		 * is what a screen reader reads out to say which table it has reached,
		 * so an area called "Zaken & Documenten" was announced as "Zaken
		 * ampersand-a-m-p semicolon Documenten".
		 */
		it('names a group in its caption the way the document spells it', () => {
			const document = fullDocument()
			document.features[0].name = 'Zaken & Documenten'
			const wrapper = mountTable(document)
			expect(wrapper.findAll('table').at(0).find('caption').text())
				.toBe('Capabilities in Zaken & Documenten, rated per system.')
		})

		/*
		 * Everything else about this table treats a malformed document as
		 * something to render anyway; the row key was the one place that
		 * assumed `id` is present and unique. Keying by position instead costs
		 * nothing — the rows are never reordered in place, only refiltered.
		 *
		 * Both halves of this pass on the old key too: a duplicate key is a
		 * patch hazard and a Vue warning, not a first-render failure, and
		 * jsdom will not stage the mis-patch for us. It is here as the
		 * contract, beside the other four the module states in prose.
		 */
		const malformed = () => {
			const document = legacyDocument()
			document.capabilities = [
				{ id: '1.1', area: 'intake', name: 'Citizen web form', dossiq: 'partial' },
				{ id: '1.1', area: 'intake', name: 'A second row wearing the same number', dossiq: 'no' },
				{ area: 'intake', name: 'A row with no number at all', dossiq: 'yes' },
			]
			return document
		}

		it('renders every row of a document that repeats an id or omits one', () => {
			const wrapper = mountTable(malformed())
			expect(wrapper.findAll('tbody tr')).toHaveLength(3)
			expect(wrapper.findAll('tbody th[scope="row"]').map((cell) => cell.text())).toEqual([
				'Citizen web form',
				'A second row wearing the same number',
				'A row with no number at all',
			])
		})

		it('brings all three back intact after a filter has narrowed them', async () => {
			const wrapper = mountTable(malformed())
			await search(wrapper, 'second')
			expect(wrapper.findAll('tbody tr')).toHaveLength(1)

			wrapper.findComponent({ name: 'NcTextField' }).vm.$emit('trailingButtonClick')
			await wrapper.vm.$nextTick()

			expect(wrapper.findAll('tbody th[scope="row"]').map((cell) => cell.text())).toEqual([
				'Citizen web form',
				'A second row wearing the same number',
				'A row with no number at all',
			])
		})

		it('is still a table with headers after a filter', async () => {
			const wrapper = mountTable(fullDocument())
			await search(wrapper, 'retention')
			expect(wrapper.findAll('table')).toHaveLength(1)
			expect(wrapper.find('thead th[scope="col"]').exists()).toBe(true)
			expect(wrapper.find('tbody th[scope="row"]').text()).toBe('Retention schedule')
		})

		it('announces the count politely through a status region', () => {
			const wrapper = mountTable(fullDocument())
			expect(wrapper.find('.cn-capability-table__count').attributes('role')).toBe('status')
		})

		it('keeps the competitor rating columns and shows an odd rating as unknown', () => {
			const document = fullDocument()
			document.capabilities[0].opencase = 'maybe'
			const wrapper = mountTable(document)
			const chips = wrapper.findAll('tbody tr').at(0).findAll('.cn-capability-table__chip')
			expect(chips.map((chip) => chip.text())).toEqual(['Partial', 'Unknown'])
		})
	})
})
