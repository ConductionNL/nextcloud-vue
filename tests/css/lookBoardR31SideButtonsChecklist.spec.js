/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqSociaalDomein side buttons span the card with the label at the start, a
 * facts action at 34px; DqTaak's checklist boxes are 18px and grey while
 * open. Read from the stylesheet text.
 *
 * @spec openspec/changes/board-r31-side-buttons-checklist-boxes/specs/board-r31-side-buttons-checklist-boxes/spec.md#requirement-a-side-cards-button-spans-the-card-with-its-label-at-the-start
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The body of the rule whose selector list ends with this selector.
 *
 * @param {string} selector The last selector of the list.
 * @return {string} The body, '' when absent.
 */
function rule(selector) {
	const at = css.lastIndexOf(selector + ' {')
	return at === -1 ? '' : css.slice(at, css.indexOf('}', at))
}

describe('look-board-detail.css: r31 side buttons and checklist boxes', () => {
	it('stretches a side facts action at 34px', () => {
		const body = rule('.cn-look-board .cn-detail-page__side .cn-facts-widget__actions:not(.cn-look-nextcloud *) > .button-vue')
		expect(body).toContain('flex: 1 1 100%;')
		expect(body).toContain('height: 34px;')
	})

	it('puts the label at the start of a side button', () => {
		expect(rule('.cn-look-board .cn-attention-flag:not(.cn-look-nextcloud *) .button-vue .button-vue__wrapper')).toContain('justify-content: flex-start;')
	})

	/** @spec openspec/changes/board-r32-tiles-and-boxes/specs/board-r32-tiles-and-boxes/spec.md#requirement-a-board-checklist-box-is-drawn-as-the-native-checkbox */
	it('draws the checklist boxes as the native checkbox: 18px, grey edge open, primary fill ticked', () => {
		const icon = '.cn-look-board .cn-checklist-widget__item .checkbox-radio-switch:not(.cn-look-nextcloud *) .checkbox-content__icon'
		expect(rule(icon)).toContain('width: 18px;')
		expect(rule(`${icon} svg`)).toContain('visibility: hidden;')
		expect(rule(`${icon}::before`)).toContain('border: 1px solid var(--color-border-maxcontrast);')
		expect(rule('.cn-look-board .cn-checklist-widget__item .checkbox-radio-switch--checked:not(.cn-look-nextcloud *) .checkbox-content__icon::before')).toContain('background: var(--color-primary-element)')
	})

	/** @spec openspec/changes/board-r32-tiles-and-boxes/specs/board-r32-tiles-and-boxes/spec.md#requirement-a-main-contacts-initials-are-in-the-soft-ink */
	it('writes a main contact\'s initials in the soft ink at 16px', () => {
		const tile = rule('.cn-look-board .cn-object-parties__main-initials:not(.cn-look-nextcloud *)')
		expect(tile).toContain('color: var(--cn-board-text-soft);')
		expect(tile).toContain('font-size: 16px;')
	})
})
