/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * badgeVariants: the colour variants a CnStatusBadge (a status pill) may take.
 *
 * The first six follow the Nextcloud colour roles. `purple` and `teal` are the
 * two tones the drawn boards use for a status that has no Nextcloud role, such
 * as "In behandeling" (work in progress) and "Omgezet naar een zaak" (handed
 * on). One list, so the badge, the board card pill and the manifest schema
 * accept the same names.
 *
 * @module utils/badgeVariants
 * @spec openspec/changes/screens-cell-pill-parity/specs/cell-pill-tones/spec.md#requirement-a-status-pill-has-eight-tones
 */

/** Every variant a status pill accepts, in the order the docs list them. */
export const BADGE_VARIANTS = Object.freeze(['default', 'primary', 'success', 'warning', 'error', 'info', 'purple', 'teal'])

/**
 * Whether a value names a badge variant.
 *
 * @param {unknown} variant The candidate variant.
 * @return {boolean} True for one of `BADGE_VARIANTS`.
 * @spec openspec/changes/screens-cell-pill-parity/specs/cell-pill-tones/spec.md#requirement-a-status-pill-has-eight-tones
 */
export function isBadgeVariant(variant) {
	return typeof variant === 'string' && BADGE_VARIANTS.includes(variant)
}
