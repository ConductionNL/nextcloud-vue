/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Fixture: syntax NEWER than the `ecmaVersion: 2022` the preset used to pin.
 *
 * This file is the pin. Every construct below parses cleanly under
 * `ecmaVersion: 'latest'` and at least one of them is a FATAL parse error under
 * `2022` — which is what makes `tests/eslint/preset.spec.js` able to tell a
 * working preset from one that has quietly downgraded its consumer again.
 *
 * A fatal parse error is not a cosmetic complaint: ESLint skips every other
 * rule on a file it could not parse, so the `vue/no-deprecated-*` gate this
 * preset exists to arm goes SILENT on exactly the files using modern syntax.
 */

// ES2024 — the `v` (unicodeSets) regexp flag, with set subtraction.
// Measured against this repo's ESLint 8.57 / espree 9.6:
//   ecmaVersion: 2022     → "Parsing error: Invalid regular expression flag"
//   ecmaVersion: 'latest' → clean
export const ASCII_NON_LOWER = /[\p{ASCII}--[a-z]]/v

// ES2022 — class static initialisation blocks and private methods.
export class Registry {

	static #instances = 0

	static {
		Registry.created = 0
	}

	#items = []

	#normalise(value) {
		return value?.trim?.() ?? ''
	}

	add(value) {
		this.#items = [...this.#items, this.#normalise(value)]
		Registry.#instances++
		return this
	}

	get size() {
		return this.#items.length
	}

}

// ES2020/2021 — optional chaining, nullish coalescing, logical assignment and
// numeric separators. These are the constructs `ecmaVersion: 6` choked on and
// turned into 20 phantom `eslint-plugin-import` warnings.
export function resolve(config) {
	const limit = config?.limits?.max ?? 1_000
	const out = { ...config, limit }
	out.label ??= 'unnamed'
	return out
}
