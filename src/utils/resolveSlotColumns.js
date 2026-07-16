/**
 * Resolve the grid column count for a manifest slot.
 *
 * Single source of truth shared by the renderer (`CnWidgetGrid`) and the
 * validator (`validateManifest`) so the two can never disagree about how wide
 * a slot is — a disagreement would let a manifest pass validation yet clip at
 * render time.
 *
 * Resolution order (first defined wins):
 *   1. an explicit `propColumns` (the `CnWidgetGrid` `columns` prop)
 *   2. a per-page override `slotColumns[slotName]`
 *   3. the library default for the slot (`body`/`tab:*`/`section:*` = 12,
 *      `sidebar` = 1)
 *
 * Absent (1) and (2), this reproduces the ADR-036 Decision 2 defaults exactly.
 *
 * @module utils/resolveSlotColumns
 */

/** Default per-slot column counts (ADR-036 Decision 2). */
export const SLOT_COLUMNS_DEFAULTS = Object.freeze({
	body: 12,
	sidebar: 1,
	'header-actions': 12,
	footer: 12,
	modal: 12,
})

/**
 * Library default column count for a slot name (no overrides applied).
 *
 * @param {string} slotName Slot key (e.g. "body", "sidebar", "tab:general").
 * @return {number} Default column count.
 */
export function defaultSlotColumns(slotName) {
	if (!slotName) return 12
	if (Object.prototype.hasOwnProperty.call(SLOT_COLUMNS_DEFAULTS, slotName)) {
		return SLOT_COLUMNS_DEFAULTS[slotName]
	}
	if (/^tab:/.test(slotName) || /^section:/.test(slotName)) return 12
	return 12
}

/**
 * Resolve the effective column count for a slot.
 *
 * @param {string} slotName Slot key.
 * @param {object|null} [slotColumns] Per-page override map (slot → integer),
 *   typically `page.config.slotColumns`.
 * @param {number|null} [propColumns] Explicit override (the `columns` prop);
 *   `null`/`undefined` means "not set".
 * @return {number} Effective column count (always a positive integer).
 */
export function resolveSlotColumns(slotName, slotColumns = null, propColumns = null) {
	if (isPositiveInt(propColumns)) return propColumns
	if (slotColumns && isPositiveInt(slotColumns[slotName])) return slotColumns[slotName]
	return defaultSlotColumns(slotName)
}

function isPositiveInt(value) {
	return typeof value === 'number' && Number.isInteger(value) && value > 0
}
