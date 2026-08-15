/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * commandPaletteRegistry — the reactive-friendly command registration
 * store backing `useCommandPalette().register()`.
 *
 * Structurally this mirrors `src/integrations/registry.js` (Map of id →
 * descriptor, `onChange` subscribers, a `list()` snapshot) but drops that
 * module's cross-window/cross-bundle installation machinery: integrations
 * are registered once, by a different app bundle than the one that reads
 * them (OpenRegister vs. a leaf app), so that registry needs a
 * `window.OCA.*` handshake. Commands are registered AND consumed by
 * components inside the SAME app bundle — no cross-bundle boundary to
 * cross, so a plain per-bundle module singleton is sufficient.
 *
 * Duplicate-id policy deliberately differs from the integration registry
 * too: integrations are registered once at boot and a collision is almost
 * always a real bug (dev-throws there). Commands are registered from
 * page-scoped components' `mounted()`/`unmounted()` hooks and can
 * legitimately re-register the same id across a route change (e.g. a
 * "Create new" command whose `run` closes over the current page's store).
 * A collision here silently UPSERTS (last registration wins) rather than
 * throwing — the churn is expected, not exceptional.
 *
 * @module commandPalette/registry
 */

/**
 * Create a fresh, isolated command registry. Most call sites want the
 * default singleton (`commandPaletteRegistry`, below); use the factory
 * directly only for test isolation or a deliberately separate palette
 * instance.
 *
 * @return {object} Registry API — `register`, `unregister`, `list`, `get`, `has`, `onChange`, `__resetForTests`.
 */
export function createCommandRegistry() {
	const commands = new Map()
	const listeners = new Set()

	/**
	 * @return {void}
	 */
	function notify() {
		const snapshot = list()
		for (const fn of listeners) {
			try {
				fn(snapshot)
			} catch (e) {
				// eslint-disable-next-line no-console
				console.error('[commandPalette] onChange subscriber threw', e)
			}
		}
	}

	/**
	 * Register (or upsert) a command.
	 *
	 * @param {object} entry The command descriptor.
	 * @param {string} entry.id Stable id — re-registering the same id upserts.
	 * @param {string} entry.title Human-readable label (already translated) — the primary ranked field.
	 * @param {string} [entry.section] Section label the palette groups this command under (e.g. "Actions").
	 * @param {string[]} [entry.keywords] Extra ranked search terms beyond the title.
	 * @param {string} [entry.icon] MDI icon name resolved against `CnIcon`'s ICON_MAP.
	 * @param {number} [entry.order] Numeric ordering hint used for the empty-query idle list; lower sorts first (default 100).
	 * @param {Function} entry.run Invoked (no arguments) when the command is activated — REQUIRED.
	 * @return {object} The normalised, stored entry.
	 */
	function register(entry) {
		if (entry === null || typeof entry !== 'object') {
			throw new TypeError('[commandPalette] register() requires an object descriptor')
		}
		if (typeof entry.id !== 'string' || entry.id === '') {
			throw new TypeError('[commandPalette] register() requires a non-empty string `id`')
		}
		if (typeof entry.title !== 'string' || entry.title === '') {
			throw new TypeError(`[commandPalette] command "${entry.id}" requires a non-empty string \`title\``)
		}
		if (typeof entry.run !== 'function') {
			throw new TypeError(`[commandPalette] command "${entry.id}" requires a \`run\` function`)
		}

		const normalised = {
			id: entry.id,
			title: entry.title,
			section: typeof entry.section === 'string' && entry.section !== '' ? entry.section : 'Actions',
			keywords: Array.isArray(entry.keywords) ? entry.keywords.slice() : [],
			icon: typeof entry.icon === 'string' && entry.icon !== '' ? entry.icon : null,
			order: typeof entry.order === 'number' ? entry.order : 100,
			run: entry.run,
			kind: 'command',
		}
		commands.set(entry.id, normalised)
		notify()
		return normalised
	}

	/**
	 * Remove a previously registered command.
	 *
	 * @param {string} id Command id.
	 * @return {boolean} True if a command was removed.
	 */
	function unregister(id) {
		const removed = commands.delete(id)
		if (removed) notify()
		return removed
	}

	/**
	 * Snapshot of all registered commands, sorted by `order` ascending then
	 * `title` ascending for a stable idle-list order.
	 *
	 * @return {object[]} The command list.
	 */
	function list() {
		return Array.from(commands.values()).sort((a, b) => {
			if (a.order !== b.order) return a.order - b.order
			return a.title.localeCompare(b.title)
		})
	}

	/**
	 * @param {string} id Command id.
	 * @return {?object} The entry, or null when unregistered.
	 */
	function get(id) {
		return commands.get(id) || null
	}

	/**
	 * @param {string} id Command id.
	 * @return {boolean} True when registered.
	 */
	function has(id) {
		return commands.has(id)
	}

	/**
	 * Subscribe to registry changes.
	 *
	 * @param {(snapshot: object[]) => void} fn Listener, called with the current snapshot on every register/unregister.
	 * @return {() => boolean} Unsubscribe function.
	 */
	function onChange(fn) {
		if (typeof fn !== 'function') {
			throw new TypeError('[commandPalette] onChange() requires a function')
		}
		listeners.add(fn)
		return () => listeners.delete(fn)
	}

	/**
	 * Test seam — clears every registered command, notifying subscribers
	 * of the (now empty) list. Deliberately does NOT clear `listeners`:
	 * a long-lived subscription (e.g. `useCommandPalette`'s module-level
	 * reactive snapshot, subscribed once at import time) must survive a
	 * per-test data reset — severing it here would silently stop that
	 * snapshot from ever updating again for the rest of the test file.
	 * Tests that also need to clear listeners should call `onChange`'s
	 * own returned unsubscribe function directly.
	 *
	 * @return {void}
	 */
	function __resetForTests() {
		commands.clear()
		notify()
	}

	return { register, unregister, list, get, has, onChange, __resetForTests }
}

/**
 * Default per-bundle singleton. `useCommandPalette()` reads this unless
 * given an explicit override.
 *
 * @type {object}
 */
export const commandPaletteRegistry = createCommandRegistry()
