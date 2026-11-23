/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnChoiceMatrix `pickPerRow`, as boards LqInleveringNakijken and LqLlInleveren
 * draw a rubric: one level per criterion, with points and a running score.
 *
 * @spec openspec/changes/choice-matrix-pick-per-row/specs/choice-matrix-pick-per-row/spec.md
 */
import { mount } from '@vue/test-utils'
import CnChoiceMatrix from '../../src/components/CnChoiceMatrix/CnChoiceMatrix.vue'

const ROWS = [
	{
		id: 'c1',
		label: 'Opening',
		weight: 2,
		options: [
			{ key: 'none', label: 'Missing', points: 0 },
			{ key: 'vague', label: 'Vague', description: 'Present but unclear', points: 1 },
			{ key: 'clear', label: 'Clear', points: 3 },
		],
	},
	{
		id: 'c2',
		label: 'Language',
		weight: 1,
		options: [
			{ key: 'many', label: 'Many errors', points: 0 },
			{ key: 'few', label: 'Few errors', points: 1.5 },
		],
	},
]

/**
 * Mounts the matrix as a host would: a parent that writes the map back.
 *
 * @param {object} [props] The props.
 * @param {object} [slots] The slots.
 * @return {object} The mounted matrix.
 */
function mountRubric(props = {}, slots = {}) {
	const wrapper = mount(CnChoiceMatrix, {
		props: {
			pickPerRow: true,
			rows: ROWS,
			'onUpdate:modelValue': (value) => wrapper.setProps({ modelValue: value }),
			...props,
		},
		slots,
		global: { stubs: { NcSelect: { template: '<div class="select" />' } } },
	})
	return wrapper
}

const option = (w, row, key) => w.find(`[data-testid="cn-choice-matrix-option-${row}-${key}"]`)
const score = (w) => w.find('[data-testid="cn-choice-matrix-score"] strong')

describe('CnChoiceMatrix pickPerRow', () => {
	it('draws each row as a radio group with its own levels and no grid', () => {
		const w = mountRubric()
		expect(w.find('table').exists()).toBe(false)
		expect(w.find('[data-testid="cn-choice-matrix-row-c1"]').attributes('role')).toBe('radiogroup')
		expect(w.find('[data-testid="cn-choice-matrix-row-c1"] legend').text()).toContain('Opening')
		expect(w.findAll('[data-testid="cn-choice-matrix-row-c1"] input[type="radio"]')).toHaveLength(3)
		expect(w.findAll('[data-testid="cn-choice-matrix-row-c2"] input[type="radio"]')).toHaveLength(2)
	})

	it('keeps the picks of a row together, and rows apart', () => {
		const w = mountRubric()
		const name = (row, key) => option(w, row, key).attributes('name')
		expect(name('c1', 'none')).toBe(name('c1', 'clear'))
		expect(name('c1', 'none')).not.toBe(name('c2', 'many'))
		const other = mountRubric()
		expect(other.find('[data-testid="cn-choice-matrix-option-c1-none"]').attributes('name')).not.toBe(name('c1', 'none'))
	})

	it('shows a level with its text and points, in words', () => {
		const w = mountRubric()
		const label = (row, key) => option(w, row, key).element.closest('label').textContent
		expect(label('c1', 'vague')).toContain('Present but unclear')
		expect(label('c1', 'vague')).toContain('1 point')
		expect(label('c1', 'vague')).not.toContain('1 points')
		expect(label('c1', 'clear')).toContain('3 points')
		expect(label('c2', 'few')).toContain('1.5 points')
	})

	it('emits the pick per row, and leaves the other rows alone', async () => {
		const w = mountRubric({ modelValue: { c2: 'few' } })
		await option(w, 'c1', 'clear').setValue()
		expect(w.emitted('update:modelValue')[0][0]).toEqual({ c1: 'clear', c2: 'few' })
		expect(w.emitted('cell-change')[0][0]).toEqual({ rowId: 'c1', columnKey: 'clear', value: 'clear', previous: undefined })
	})

	it('shows what is picked', () => {
		const w = mountRubric({ modelValue: { c1: 'vague' } })
		expect(option(w, 'c1', 'vague').element.checked).toBe(true)
		expect(option(w, 'c1', 'clear').element.checked).toBe(false)
		expect(option(w, 'c1', 'vague').element.closest('label').className).toContain('--picked')
	})

	it('uses the columns when a row has no options of its own', () => {
		const w = mountRubric({ rows: [{ id: 'r', label: 'Row' }], columns: [{ key: 'a', label: 'A', points: 2 }, { key: 'b', label: 'B', points: 4 }], scoreLabel: true })
		expect(w.findAll('input[type="radio"]')).toHaveLength(2)
		expect(score(w).text()).toBe('Score: 0 of 4')
	})

	describe('the score', () => {
		it('adds the points up against the highest of each row, as board "Score: 8 van 10"', async () => {
			const w = mountRubric({ scoreLabel: 'Score: {score} van {max}', modelValue: { c1: 'clear' } })
			expect(score(w).text()).toBe('Score: 3 van 4.5')
			await option(w, 'c2', 'few').setValue()
			expect(score(w).text()).toBe('Score: 4.5 van 4.5')
		})

		it('ignores the weight unless told to', () => {
			expect(mountRubric({ scoreLabel: true, modelValue: { c1: 'clear' } }).vm.score.score).toBe(3)
			const weighted = mountRubric({ scoreLabel: true, scoreMode: 'weighted', modelValue: { c1: 'clear', c2: 'few' } })
			expect(weighted.vm.score).toEqual({ score: 7.5, max: 7.5, complete: true })
		})

		it('takes the host maximum', () => {
			expect(score(mountRubric({ scoreLabel: true, scoreMax: 10 })).text()).toBe('Score: 0 of 10')
		})

		it('shows no score line unless asked', () => {
			expect(mountRubric().find('[data-testid="cn-choice-matrix-score"]').exists()).toBe(false)
		})

		it('reports to the host on mount and on change, with whether it is complete', async () => {
			const w = mountRubric({ modelValue: { c1: 'clear' } })
			expect(w.emitted('score-change')[0][0]).toEqual({ score: 3, max: 4.5, complete: false })
			await option(w, 'c2', 'few').setValue()
			expect(w.emitted('score-change').at(-1)[0]).toEqual({ score: 4.5, max: 4.5, complete: true })
		})

		it('counts a read-only row as complete', () => {
			const w = mountRubric({ rows: [ROWS[0], { ...ROWS[1], readOnly: true }], modelValue: { c1: 'clear' } })
			expect(w.vm.score.complete).toBe(true)
		})

		it('draws the note beside the score', () => {
			const w = mountRubric({ scoreLabel: true }, { scoreNote: '<em class="note">On time</em>' })
			expect(w.find('[data-testid="cn-choice-matrix-score"] .note').exists()).toBe(true)
		})
	})

	it('names the weight, in the words of the host', () => {
		expect(mountRubric().find('[data-testid="cn-choice-matrix-row-c1"] legend').text()).toContain('(weight 2)')
		expect(mountRubric({ weightTemplate: '(weging {weight})' }).find('[data-testid="cn-choice-matrix-row-c1"] legend').text()).toContain('(weging 2)')
	})

	it('ties a row error to its group, and only that row', () => {
		const w = mountRubric({ rowErrors: { c2: 'Pick a level' } })
		const group = w.find('[data-testid="cn-choice-matrix-row-c2"]')
		const error = group.find('[data-testid="cn-choice-matrix-row-error"]')
		expect(error.text()).toBe('Pick a level')
		expect(group.attributes('aria-invalid')).toBe('true')
		expect(group.attributes('aria-describedby')).toBe(error.attributes('id'))
		expect(w.find('[data-testid="cn-choice-matrix-row-c1"]').attributes('aria-invalid')).toBeUndefined()
	})

	it('disables the radios when read only, row by row or as a whole', () => {
		const row = mountRubric({ rows: [ROWS[0], { ...ROWS[1], readOnly: true }] })
		expect(option(row, 'c2', 'few').attributes('disabled')).toBeDefined()
		expect(option(row, 'c1', 'clear').attributes('disabled')).toBeUndefined()
		expect(option(mountRubric({ readOnly: true }), 'c1', 'clear').attributes('disabled')).toBeDefined()
	})

	it('says it is empty with no rows, or rows without options', () => {
		expect(mountRubric({ rows: [] }).find('[data-testid="cn-choice-matrix-empty"]').exists()).toBe(true)
		expect(mountRubric({ rows: [{ id: 'r', label: 'R' }] }).find('[data-testid="cn-choice-matrix-empty"]').exists()).toBe(true)
	})

	describe('without pickPerRow', () => {
		const grid = (props = {}) => mountRubric({
			pickPerRow: false,
			rows: [{ id: 'r', label: 'Row' }],
			columns: [{ key: 'a', label: 'A' }],
			choices: [{ value: 'x', label: 'X' }],
			...props,
		})

		it('still draws the grid, and reports no score', () => {
			const w = grid()
			expect(w.find('table').exists()).toBe(true)
			expect(w.find('input[type="radio"]').exists()).toBe(false)
			expect(w.emitted('score-change')).toBeUndefined()
		})

		it('shows a row error on the row', () => {
			expect(grid({ rowErrors: { r: 'Set this row' } }).find('[data-testid="cn-choice-matrix-row-error"]').text()).toBe('Set this row')
		})
	})
})
