/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `v-cn-select-aria`: puts `aria-invalid`, `aria-describedby` and
 * `aria-required` on the search input of an NcSelect.
 *
 * NcSelect forwards no attributes to its input: an attribute bound on it lands
 * on the wrapping `.v-select` div, where a screen reader never reads it. The
 * input is the combobox, so the attributes belong there. This directive sets
 * them on that input after every render, and removes the ones that go away
 * (a field that becomes valid loses `aria-invalid`).
 *
 * Usage: `<NcSelect v-cn-select-aria="{ 'aria-invalid': 'true', 'aria-describedby': 'err-id' }" />`
 * A `null` or `undefined` value does nothing, so a caller can bind it
 * unconditionally.
 *
 * @spec openspec/changes/screens-form-parity/tasks.md
 */

const ARIA_ATTRIBUTES = ['aria-invalid', 'aria-describedby', 'aria-required']

/**
 * Apply the bound attributes to the combobox input inside the element.
 *
 * @param {HTMLElement} el The element the directive sits on (the select root).
 * @param {{value: object|null|undefined}} binding The directive binding.
 * @return {void}
 */
function apply(el, binding) {
	const attributes = binding.value
	if (!attributes || typeof el.querySelector !== 'function') {
		return
	}
	const input = el.querySelector('input.vs__search') || el.querySelector('input')
	if (!input) {
		return
	}
	for (const name of ARIA_ATTRIBUTES) {
		const value = attributes[name]
		if (value === undefined || value === null || value === false) {
			input.removeAttribute(name)
		} else {
			input.setAttribute(name, String(value))
		}
	}
}

export const cnSelectAria = {
	mounted: apply,
	updated: apply,
}

export default cnSelectAria
