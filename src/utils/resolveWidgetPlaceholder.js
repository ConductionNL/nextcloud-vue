/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * resolveWidgetPlaceholder — the one place that knows where a dashboard
 * widget's placeholder shape comes from (widget-placeholder-shape, design D2).
 *
 * A widget waits for its content in one of six shapes (design D1). Its shape is
 * the first of: the manifest widget declaration (`widgetDef.placeholder`), the
 * registry entry of its type (`entry.placeholder`), the descriptor a host passes
 * for a Nextcloud dashboard API widget (`{ placeholder }`), and otherwise
 * `rows`. A declaration is a shape name or `{ shape, count }` with `count` an
 * integer from 1 to 24.
 *
 * @spec openspec/changes/widget-placeholder-shape/tasks.md#task-1
 */

/**
 * The closed set of placeholder shapes (design D1).
 *
 * @type {ReadonlyArray<string>}
 */
export const WIDGET_PLACEHOLDER_SHAPES = Object.freeze(['rows', 'lines', 'block', 'tiles', 'counter', 'heading'])

/**
 * The lowest and highest count a declaration may carry.
 *
 * @type {Readonly<{min: number, max: number}>}
 */
export const WIDGET_PLACEHOLDER_COUNT = Object.freeze({ min: 1, max: 24 })

/**
 * The shape a widget waits in when nothing declares one.
 *
 * @type {string}
 */
export const DEFAULT_WIDGET_PLACEHOLDER_SHAPE = 'rows'

/**
 * Normalise a placeholder declaration to `{ shape, count? }`.
 *
 * @param {*} value A shape name, `{ shape, count }`, or anything else.
 * @return {{shape: string, count?: number}|null} The normalised declaration, or `null` when the value is not a valid one.
 */
export function normalizeWidgetPlaceholder(value) {
	if (typeof value === 'string') {
		return WIDGET_PLACEHOLDER_SHAPES.includes(value) ? { shape: value } : null
	}
	if (value === null || typeof value !== 'object' || Array.isArray(value)) {
		return null
	}
	if (!WIDGET_PLACEHOLDER_SHAPES.includes(value.shape)) {
		return null
	}
	if (value.count === undefined) {
		return { shape: value.shape }
	}
	if (!Number.isInteger(value.count) || value.count < WIDGET_PLACEHOLDER_COUNT.min || value.count > WIDGET_PLACEHOLDER_COUNT.max) {
		return null
	}
	return { shape: value.shape, count: value.count }
}

/**
 * Whether a value is a valid placeholder declaration.
 *
 * @param {*} value The value to check.
 * @return {boolean} True for a shape name or a valid `{ shape, count }`.
 */
export function isValidWidgetPlaceholder(value) {
	return normalizeWidgetPlaceholder(value) !== null
}

/**
 * Resolve a widget's placeholder shape: manifest, registry, Nextcloud
 * descriptor, then `rows` (design D2). An invalid declaration at any step is
 * skipped, so the next step decides.
 *
 * @param {object|null|undefined} widgetDef The manifest widget declaration (reads `placeholder`).
 * @param {object|null|undefined} registryEntry The registry entry of the widget's type (reads `placeholder`).
 * @param {object|null|undefined} ncDescriptor The descriptor of a Nextcloud dashboard API widget (reads `placeholder`).
 * @return {{shape: string, count?: number}} The shape, and the count when one is declared.
 */
export function resolveWidgetPlaceholder(widgetDef, registryEntry, ncDescriptor) {
	for (const source of [widgetDef, registryEntry, ncDescriptor]) {
		const declared = normalizeWidgetPlaceholder(source?.placeholder)
		if (declared !== null) {
			return declared
		}
	}
	return { shape: DEFAULT_WIDGET_PLACEHOLDER_SHAPE }
}
