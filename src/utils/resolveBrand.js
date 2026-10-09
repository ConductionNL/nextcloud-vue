/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Reads a declared brand (`nav.brand`, or the `brand` prop of CnAppNav and
 * CnAppRoot) into the one shape the brand block and the brand bar draw.
 *
 * @spec openspec/changes/screens-brand-block-top-bar/tasks.md
 */

/**
 * Resolve a declared brand.
 *
 * @param {object|null|undefined} declared The declared brand.
 * @param {(text: string) => string} translate Label lookup for name, caption and alt.
 * @return {{logo: string, emblem: (string|boolean), name: string, caption: string, alt: string, placement: string}|null}
 *   The brand, or null when nothing is declared that can be drawn.
 */
export function resolveBrand(declared, translate) {
	if (!declared || typeof declared !== 'object') {
		return null
	}
	const text = (value) => (typeof value === 'string' && value !== '' ? translate(value) : '')
	const brand = {
		logo: typeof declared.logo === 'string' ? declared.logo : '',
		// A URL, or `true` for the theme's emblem (--nldesign-emblem-url).
		emblem: declared.emblem === true ? true : (typeof declared.emblem === 'string' ? declared.emblem : ''),
		name: text(declared.name),
		caption: text(declared.caption),
		alt: text(declared.alt),
		// '' means "not declared": the caller decides the default from the look.
		placement: declared.placement === 'nav' || declared.placement === 'top-bar' ? declared.placement : '',
	}
	return (brand.logo || brand.emblem || brand.name || brand.caption) ? brand : null
}

export default resolveBrand
