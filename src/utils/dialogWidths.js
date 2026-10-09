// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2

/**
 * The three dialog widths of the screens canon (section 5 of UNIFORM-canon.md),
 * by role. No other width is reachable through the `width` prop of a `Cn*`
 * dialog.
 *
 * @spec openspec/changes/screens-dialog-parity/specs/dialog-system/spec.md#requirement-a-dialog-takes-one-of-three-widths
 * @type {Readonly<Record<string, number>>}
 */
export const DIALOG_WIDTHS = Object.freeze({
	confirm: 560,
	form: 640,
	wizard: 720,
})

/**
 * Resolve a width role to its role name and pixel width. An unknown or empty
 * `width` falls back to the component's default role, and an unknown default
 * falls back to `form`.
 *
 * @param {string} [width] The `width` prop value.
 * @param {string} [defaultWidth] The component's default role.
 * @return {{role: string, px: number}} The role name and its width in px.
 */
export function resolveDialogWidth(width, defaultWidth) {
	const role = [width, defaultWidth].find((candidate) => Object.hasOwn(DIALOG_WIDTHS, candidate)) || 'form'
	return { role, px: DIALOG_WIDTHS[role] }
}
