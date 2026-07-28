import { ref, computed, reactive } from 'vue'
import { diffManifest } from '../utils/diffManifest.js'

/**
 * Edit-mode state machine for in-app manifest editing (ADR-041).
 *
 * Edits are applied IN PLACE to the live manifest (`baseRef.value`) while a
 * pristine `snapshot` is kept for the diff baseline and for Cancel. This is
 * deliberate: Vue 2 `inject` captures the provided `cnManifest` value once at a
 * descendant's creation, so swapping in a *separate* working-copy object would
 * never reach already-mounted renderers (CnPageRenderer, CnAppNav, …). Mutating
 * the object they already hold is what makes edits appear live.
 *
 * Raw/reactive boundary (audit item 9 — `manifest-markraw-reactivity`). The
 * bundled manifest is held RAW at boot: CnAppRoot wraps it in a `shallowRef`, so
 * Vue never deep-observes the (up to ~434 KB) immutable graph during ordinary
 * navigation — the renderer only ever reads it. `enter()` is the reactivity
 * opt-in: it observes the live manifest IN PLACE via `reactive()`, which returns
 * the SAME object with an attached observer (identity preserved, so the mounted
 * renderers described above pick up the edits) and deep-tracks the subtree the
 * editor mutates. The enter → editing flip forces those renderers to re-render
 * once and re-establish their dependencies against the now-reactive graph, after
 * which every widget move / menu / sidebar edit renders live exactly as it did
 * under the previous always-deep-reactive model. `reactive()` is idempotent, so
 * re-entering an edit session on the same manifest is a no-op.
 *
 * On Save the minimal delta is computed via `diffManifest(snapshot, live)` and
 * handed to the injected `persist` function (the library does not own the
 * persistence endpoint, per ADR-041); the snapshot is then re-baselined. Cancel
 * restores the live manifest from the snapshot in place. On the next manifest
 * publish (the host re-passing `props.manifest`, e.g. a reload or backend delta
 * merge) CnAppRoot re-installs a fresh RAW manifest into the `shallowRef`, so
 * the read path returns to non-reactive.
 *
 * `working` is the object the grid and edit modals mutate — the live manifest
 * while editing, `null` otherwise. `source` is always the live manifest.
 *
 * @param {import('vue').Ref<object>} baseRef A ref holding the active manifest
 *   (the object descendants render — e.g. CnAppRoot's manifest ref).
 * @param {object} [options] Configuration.
 * @param {(delta: object) => (void|Promise<void>)} [options.persist] Called with
 *   the computed delta on Save; may be async. A throw aborts the save (edits and
 *   editing state are preserved so the user can retry or cancel).
 * @return {{
 *   editing: import('vue').Ref<boolean>,
 *   working: import('vue').ComputedRef<object|null>,
 *   dirty: import('vue').ComputedRef<boolean>,
 *   source: import('vue').ComputedRef<object>,
 *   snapshot: import('vue').Ref<object|null>,
 *   enter: () => void,
 *   cancel: () => void,
 *   save: () => Promise<object>,
 * }}
 */
export function useManifestEditor(baseRef, options = {}) {
	const editing = ref(false)
	const snapshot = ref(null)

	const dirty = computed(() => {
		if (!editing.value || snapshot.value == null) return false
		return stableStringify(baseRef.value) !== stableStringify(snapshot.value)
	})

	// The live manifest is always the rendered source; edits mutate it in place.
	const source = computed(() => baseRef.value)
	// What the modals/grid mutate — the live manifest while editing.
	const working = computed(() => (editing.value ? baseRef.value : null))

	/**
	 * Enter edit mode: snapshot the live manifest for diff + cancel, then opt
	 * the live manifest into deep reactivity so in-place edits render.
	 *
	 * The manifest is held raw (shallowRef) at boot to skip deep observation of
	 * the immutable graph.
	 *
	 * VUE 2 -> VUE 3: this used to be `reactive(baseRef.value)` with the return
	 * value discarded. Under Vue 2 that was correct — `Vue.observable()` walked
	 * the object and rewrote its properties into getters/setters, so it MUTATED
	 * the object in place and returned the very same reference. Under Vue 3
	 * `reactive()` leaves the target untouched and returns a PROXY, so ignoring
	 * the return value made the whole call a no-op: the manifest stayed raw,
	 * nothing subscribed to it, and every in-app edit (menu rename, widget move,
	 * page add) mutated silently without re-rendering.
	 *
	 * Installing the proxy into the ref is the Vue-3 equivalent. Reference
	 * identity through `.value` necessarily changes — a proxy is not its target —
	 * but the invariant that actually matters is preserved: the proxy's target IS
	 * the object the host passed in, so `toRaw(baseRef.value)` is still that
	 * object, writes land in it, and `cancel()` restores it in place. The
	 * `editing` flip re-renders the shell so descendants re-read `source` /
	 * `working` and subscribe to the now-reactive graph.
	 *
	 * Idempotent: `reactive()` of an existing proxy returns that same proxy, so a
	 * second edit session in the same SPA lifetime is a no-op.
	 */
	function enter() {
		snapshot.value = deepClone(baseRef.value)
		if (baseRef.value != null && typeof baseRef.value === 'object') {
			baseRef.value = reactive(baseRef.value)
		}
		editing.value = true
	}

	/** Restore the live manifest from the snapshot (in place) and leave edit mode. */
	function cancel() {
		if (snapshot.value && baseRef.value) restoreInPlace(baseRef.value, snapshot.value)
		snapshot.value = null
		editing.value = false
	}

	/**
	 * Compute the delta from the snapshot to the live manifest, hand it to the
	 * injected persist function, then re-baseline the snapshot. A persist throw
	 * aborts: edits and editing state are preserved so the user can retry/cancel.
	 *
	 * @return {Promise<object>} The delta that was saved.
	 */
	async function save() {
		const delta = diffManifest(snapshot.value ?? baseRef.value, baseRef.value)
		// A no-op save (nothing changed since enter()) yields an empty delta.
		// Skip persistence entirely — a persistence backend may reject `{}`
		// (e.g. OpenRegister forbids an empty object for an object property),
		// and there is nothing to store anyway.
		const isEmptyDelta = !delta || (typeof delta === 'object' && Object.keys(delta).length === 0)
		if (isEmptyDelta === false && typeof options.persist === 'function') {
			await options.persist(delta)
		}
		snapshot.value = deepClone(baseRef.value)
		editing.value = false
		return delta
	}

	return { editing, working, dirty, source, snapshot, enter, cancel, save }
}

/**
 * Restore `target`'s contents from `snap` by mutating in place (so the object
 * identity descendants hold is preserved and the revert is reactive). Keys
 * present in the snapshot are replaced; keys added during editing are removed.
 *
 * @param {object} target The live manifest object to restore.
 * @param {object} snap The pristine snapshot to restore from.
 */
function restoreInPlace(target, snap) {
	for (const key of Object.keys(target)) {
		if (!(key in snap)) delete target[key]
	}
	for (const key of Object.keys(snap)) {
		target[key] = deepClone(snap[key])
	}
}

/**
 * structuredClone with a JSON fallback (manifests are plain JSON, no cycles).
 * @param {*} value The value to clone.
 * @return {*} A deep clone of the value.
 */
function deepClone(value) {
	if (value == null) return value
	if (typeof structuredClone === 'function') return structuredClone(value)
	return JSON.parse(JSON.stringify(value))
}

/**
 * Stable JSON for equality — manifests are plain JSON, so this is sufficient.
 * @param {*} value The value to stringify.
 * @return {string} The JSON string.
 */
function stableStringify(value) {
	return JSON.stringify(value)
}
