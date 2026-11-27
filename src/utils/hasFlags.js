/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * hasFlags: run-time half of the board look's `:has()` flags.
 *
 * The build rewrites each `:has()` that sits outside the subject of a
 * board-look selector into a flag class (hasFlagsTransform.js), because Blink
 * re-styles the whole subtree of such an anchor on every node inserted below
 * it. This module sets those flags: each flag goes on exactly the elements
 * that match the compound it stands for, so every rule selects what it did.
 *
 * One MutationObserver per document re-checks the flags after DOM changes. Its
 * callback runs as a microtask, before the browser renders or a script reads
 * layout, so no frame is drawn with a stale flag. A flag whose class or type
 * is not on the page costs nothing (a live collection's length).
 *
 * Several builds of the library can share a page: their tables are merged into
 * one engine kept on the window. Flag names are hashes of the compound, so the
 * same compound has the same flag in every build.
 *
 * @module utils/hasFlags
 */

/**
 * Where the engine is kept on the window.
 *
 * @type {string}
 */
const STATE_KEY = '__cnHasFlags'

const EMPTY = Object.freeze([])

/**
 * Start (or extend) the flag engine for a document.
 *
 * @param {Array<Array<string>>} flags The flags as [flag, compound, key] (from the build).
 * @param {string[]} [attributes] Attribute names the compounds read; `class` is always watched.
 * @param {Document} [doc] The document (defaults to the global one).
 * @return {object|null} The engine, or null when there is nothing to do.
 * @spec openspec/changes/board-look-has-flags/specs/library-stylesheet/spec.md#requirement-the-board-look-anchors-no-has-outside-the-subject
 */
export function installHasFlags(flags, attributes, doc) {
	const target = doc || (typeof document !== 'undefined' ? document : null)
	if (!target || !target.documentElement || !Array.isArray(flags) || flags.length === 0) {
		return null
	}
	const win = target.defaultView || globalThis
	if (typeof win.MutationObserver !== 'function') {
		return null
	}
	let state = win[STATE_KEY]
	if (!state || state.doc !== target) {
		state = createEngine(target, win)
		win[STATE_KEY] = state
	}
	let added = false
	for (const entry of flags) {
		const [flag, selector, key] = entry
		if (state.entries.has(flag)) {
			continue
		}
		try {
			target.querySelector(selector)
		} catch (e) {
			// A browser that cannot parse the compound would have dropped the original rule as well.
			continue
		}
		state.entries.set(flag, { flag, selector, live: liveCollection(target, key), flagged: EMPTY })
		added = true
	}
	for (const name of attributes || []) {
		if (!state.attributes.has(name)) {
			state.attributes.add(name)
			added = true
		}
	}
	if (added) {
		state.update()
	}
	return state
}

/**
 * A live collection of the elements carrying a compound's key, or null.
 *
 * @param {Document} doc The document.
 * @param {string} key `.class`, a type name, or ''.
 * @return {HTMLCollection|null} The collection.
 */
function liveCollection(doc, key) {
	if (!key) {
		return null
	}
	return key[0] === '.' ? doc.getElementsByClassName(key.slice(1)) : doc.getElementsByTagName(key)
}

/**
 * Create the engine for a document.
 *
 * @param {Document} doc The document.
 * @param {Window} win Its window.
 * @return {object} The engine.
 */
function createEngine(doc, win) {
	const state = {
		doc,
		entries: new Map(),
		attributes: new Set(['class']),
		updates: 0,
		update,
	}
	const observer = new win.MutationObserver(update)

	/** Re-check every flag and watch again. */
	function update() {
		// Our own class changes must not call us again.
		observer.disconnect()
		state.updates++
		for (const entry of state.entries.values()) {
			const matches = entry.live && entry.live.length === 0 ? EMPTY : doc.querySelectorAll(entry.selector)
			if (matches.length === 0 && entry.flagged.length === 0) {
				continue
			}
			const next = Array.from(matches)
			const keep = new Set(next)
			for (const el of entry.flagged) {
				if (!keep.has(el)) {
					el.classList.remove(entry.flag)
				}
			}
			for (const el of next) {
				// Vue rewrites the class attribute of an element it patches, so a flag can go missing.
				if (!el.classList.contains(entry.flag)) {
					el.classList.add(entry.flag)
				}
			}
			entry.flagged = next
		}
		observer.observe(doc.documentElement, {
			subtree: true,
			childList: true,
			characterData: true,
			attributes: true,
			attributeFilter: [...state.attributes],
		})
	}
	return state
}
