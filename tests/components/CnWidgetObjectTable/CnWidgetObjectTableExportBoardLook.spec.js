/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The boards draw a table's "CSV exporteren" as a neutral 40px control: the
 * main text at 14px/600 on the main background with the control border
 * (DqTermijnen). Live it was Nextcloud's 34px tertiary button, which a theme
 * draws in its button ink. The export row carries its own class so the board
 * look reaches only that button. jsdom draws no layout, so the board rules are
 * read from the stylesheet text.
 *
 * @spec openspec/changes/board-table-export-button/specs/board-table-export-button/spec.md#requirement-a-board-table-export-button-is-a-neutral-40px-control
 */
import axios from '@nextcloud/axios'
import { shallowMount } from '@vue/test-utils'
const fs = require('fs')
const path = require('path')
import CnWidgetObjectTable from '../../../src/components/CnWidgetObjectTable/CnWidgetObjectTable.vue'

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({
	__esModule: true,
	generateUrl: jest.fn((p) => `/nc${p}`),
}))
jest.mock('../../../src/store/useObjectStore.js', () => ({
	useObjectStore: jest.fn(() => ({ objectTypeRegistry: {}, errors: {} })),
}))

const css = fs.readFileSync(path.join(__dirname, '../../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The body of the first rule whose selector list holds this selector.
 *
 * @param {string} selector The selector.
 * @return {string|null} The rule body, or null.
 */
function ruleFor(selector) {
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(css))) {
		if (m[1].split(/,(?![^(]*\))/).map((s) => s.trim()).includes(selector)) {
			return m[2]
		}
	}
	return null
}

async function flush() {
	for (let i = 0; i < 4; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
	}
}

describe('CnWidgetObjectTable export button', () => {
	it('sits in a footer row of its own kind', async () => {
		axios.get.mockResolvedValue({ data: { rows: [{ id: 'a', name: 'A' }] } })
		const wrapper = shallowMount(CnWidgetObjectTable, {
			propsData: { endpointSource: { url: '/apps/app/api/report', responsePath: 'rows' }, columns: ['name'], exportCsv: true },
		})
		await flush()

		const footer = wrapper.find('.cn-widget-object-table__footer--export')
		expect(footer.exists()).toBe(true)
		expect(footer.find('[data-testid="cn-widget-export-csv"]').exists()).toBe(true)
	})
})

describe('look-board.css: table export button', () => {
	it('hands the row the main text as the button ink', () => {
		expect(ruleFor('.cn-look-board .cn-widget-object-table__footer--export:not(.cn-look-nextcloud *)')).toContain('--nldesign-component-button-color: var(--color-main-text);')
	})

	it('draws the button as a neutral 40px control', () => {
		const body = ruleFor('.cn-look-board .cn-widget-object-table__footer--export:not(.cn-look-nextcloud *) .button-vue')
		expect(body).not.toBeNull()
		expect(body).toContain('--button-size: var(--cn-board-control-height);')
		expect(body).toContain('border: 1px solid var(--cn-board-control-border);')
		expect(body).toContain('border-radius: var(--cn-board-control-radius);')
		expect(body).toContain('background: var(--color-main-background);')
		expect(body).toContain('font-size: 14px;')
		expect(body).toContain('font-weight: 600;')
	})
})
