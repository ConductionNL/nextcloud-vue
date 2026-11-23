/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A board select that holds a value keeps its label above the control.
 *
 * NcSelect (@nextcloud/vue 9.11) shrinks the label of a select with a value
 * onto its border with a rule of eight classes:
 *
 *   .nc-select.v-select.select .vs__selected-options:has(.vs__selected)
 *     .vs__search .input-field__input + .input-field__label
 *
 * The board rules that lift the label above the control (a settings card in
 * look-board.css, a board dialog in dialog.css) set its bottom but lost the
 * top to that rule, so the label was pinned at both ends and squashed to a
 * sliver over the control (DqInstellingen "Kadaster (BRK): bron",
 * DqPersoonlijkeInstellingen "Meldingsdomein"). jsdom has no layout, so this
 * reads the stylesheets: a rule that sets `inset-block-start: auto` on that
 * label must outrank NcSelect's.
 *
 * @spec openspec/changes/board-filled-select-label/specs/board-filled-select-label/spec.md
 */

const fs = require('fs')
const path = require('path')
const postcss = require('postcss')
const selectorParser = require('postcss-selector-parser')

const NC_FILLED_LABEL = '.nc-select.v-select.select .vs__selected-options:has(.vs__selected) .vs__search .input-field__input + .input-field__label'

/**
 * The specificity of one selector as [ids, classes, types]; `:not()` and
 * `:has()` count as their heaviest argument.
 *
 * @param {object} node A postcss-selector-parser container.
 * @return {number[]} The specificity.
 */
function specificityOf(node) {
	const total = [0, 0, 0]
	node.each((child) => {
		if (child.type === 'id') {
			total[0]++
		} else if (child.type === 'class' || child.type === 'attribute') {
			total[1]++
		} else if (child.type === 'tag') {
			total[2]++
		} else if (child.type === 'pseudo') {
			if ([':not', ':has', ':is'].includes(child.value)) {
				const heaviest = child.nodes.map(specificityOf).sort(compare).pop() || [0, 0, 0]
				total[0] += heaviest[0]
				total[1] += heaviest[1]
				total[2] += heaviest[2]
			} else if (child.value.startsWith('::')) {
				total[2]++
			} else if (child.value !== ':where') {
				total[1]++
			}
		}
	})
	return total
}

/**
 * @param {number[]} a A specificity.
 * @param {number[]} b A specificity.
 * @return {number} Negative when a is lighter.
 */
function compare(a, b) {
	return a[0] - b[0] || a[1] - b[1] || a[2] - b[2]
}

/**
 * @param {string} selector One selector.
 * @return {number[]} Its specificity.
 */
function specificity(selector) {
	let result = [0, 0, 0]
	selectorParser((root) => {
		result = specificityOf(root.first)
	}).processSync(selector)
	return result
}

/**
 * The selectors in a stylesheet that set `inset-block-start: auto` on a
 * select's raised label.
 *
 * @param {string} file The file under src/css.
 * @return {string[]} The selectors.
 */
function liftingSelectors(file) {
	const css = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'css', file), 'utf8')
	const out = []
	postcss.parse(css).walkDecls('inset-block-start', (decl) => {
		if (decl.value !== 'auto' || decl.parent.type !== 'rule') {
			return
		}
		for (const selector of decl.parent.selectors) {
			if (selector.includes('.vs__selected-options:has(.vs__selected)') && selector.includes('.input-field__label')) {
				out.push(selector)
			}
		}
	})
	return out
}

describe('a board select with a value keeps its label above the control', () => {
	it.each([['look-board.css'], ['dialog.css']])('%s outranks NcSelect\'s filled-label rule', (file) => {
		const selectors = liftingSelectors(file)
		expect(selectors.length).toBeGreaterThan(0)
		for (const selector of selectors) {
			expect(compare(specificity(selector), specificity(NC_FILLED_LABEL))).toBeGreaterThan(0)
		}
	})
})
