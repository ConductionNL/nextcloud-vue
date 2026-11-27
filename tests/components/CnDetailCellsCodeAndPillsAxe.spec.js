/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A scrolling grid cell with nothing focusable is a tab stop, a read-only code
 * viewer's text area is named and reachable, and the lifecycle pills use the
 * text colours Nextcloud pairs with their backgrounds.
 *
 * @spec openspec/changes/detail-cells-code-and-pills-pass-axe/specs/detail-cells-code-and-pills-pass-axe/spec.md#requirement-code-scrolling-cells-and-lifecycle-pills-pass-axe
 */
import * as fs from 'fs'
import * as path from 'path'
import { markScrollableCell } from '../../src/components/CnDashboardGrid/CnDashboardGrid.vue'
import CnJsonViewer from '../../src/components/CnJsonViewer/CnJsonViewer.vue'

/**
 * A cell whose content is `content` px tall in a `box` px tall cell.
 *
 * @param {number} content scroll height.
 * @param {number} box client height.
 * @param {string} inner the cell's markup.
 * @return {HTMLElement}
 */
function cell(content, box, inner = '<p>Text</p>') {
	const element = document.createElement('div')
	element.className = 'grid-stack-item-content'
	element.innerHTML = inner
	Object.defineProperty(element, 'scrollHeight', { configurable: true, get: () => content })
	Object.defineProperty(element, 'clientHeight', { configurable: true, get: () => box })
	Object.defineProperty(element, 'scrollWidth', { configurable: true, get: () => 100 })
	Object.defineProperty(element, 'clientWidth', { configurable: true, get: () => 100 })
	return element
}

describe('markScrollableCell', () => {
	it('makes a scrolling cell with nothing focusable a tab stop', () => {
		const element = cell(400, 200)
		expect(markScrollableCell(element)).toBe(true)
		expect(element.getAttribute('tabindex')).toBe('0')
	})

	it('leaves a cell that fits alone', () => {
		const element = cell(200, 200)
		expect(markScrollableCell(element)).toBe(false)
		expect(element.hasAttribute('tabindex')).toBe(false)
	})

	it('leaves a scrolling cell that holds a focusable element alone', () => {
		const element = cell(400, 200, '<a href="#x">Link</a>')
		expect(markScrollableCell(element)).toBe(false)
		expect(element.hasAttribute('tabindex')).toBe(false)
	})

	it('takes the stop away once the content fits', () => {
		let height = 400
		const element = cell(0, 200)
		Object.defineProperty(element, 'scrollHeight', { configurable: true, get: () => height })
		markScrollableCell(element)
		height = 150
		expect(markScrollableCell(element)).toBe(false)
		expect(element.hasAttribute('tabindex')).toBe(false)
	})

	it('keeps a tabindex it did not set', () => {
		const element = cell(200, 200)
		element.setAttribute('tabindex', '-1')
		markScrollableCell(element)
		expect(element.getAttribute('tabindex')).toBe('-1')
	})
})

describe('CnJsonViewer text area attributes', () => {
	const attributes = (props) => CnJsonViewer.computed.contentAttributes.call({ label: 'Code', readOnly: false, ...props })

	it('names the text area with the label', () => {
		expect(attributes({ label: 'Raw data' })).toEqual({ 'aria-label': 'Raw data' })
	})

	it('makes a read-only text area a tab stop', () => {
		expect(attributes({ readOnly: true })).toEqual({ 'aria-label': 'Code', tabindex: '0' })
	})

	it('defaults the label to Code', () => {
		expect(CnJsonViewer.props.label.default).toBe('Code')
	})
})

describe('CnFlowLifecycleControls pills', () => {
	const source = fs.readFileSync(path.resolve(__dirname, '../../src/components/CnFlowDetail/CnFlowLifecycleControls.vue'), 'utf8')
	const rule = (name) => source.match(new RegExp(`\\.cn-flow-lifecycle__pill--${name} \\{([^}]*)\\}`))[1]

	it('draws published text in the success text colour', () => {
		expect(rule('published')).toContain('color: var(--color-success-text')
	})

	it('draws deprecated text in the warning text colour', () => {
		expect(rule('deprecated')).toContain('color: var(--color-warning-text')
	})
})
