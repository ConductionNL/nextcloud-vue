/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 */

import { computed, onMounted } from 'vue'
import { resolveIndexSource } from '../../composables/indexSources.js'

/**
 * Third data mode for CnIndexPage: a NAMED source.
 *
 * The page already knew two ways to get rows — fetch OpenRegister objects from
 * `register` + `schema`, or accept them as `:objects`. Neither reaches a list
 * that is not an OpenRegister object and not already in a parent's hands, so
 * those lists became `type: "custom"` pages whose only real job was loading
 * rows from somewhere else.
 *
 * `source` closes that: the manifest names a source and the index loads it.
 *
 * Precedence is deliberate and narrow. NON-EMPTY `:objects` still wins, so a
 * parent that hands rows down is never overridden by a source it did not ask
 * for; and a source wins over `register`/`schema`, because naming both is a
 * contradiction and silently self-fetching would render the WRONG list rather
 * than an obviously empty one.
 *
 * Note the test is "has rows", not "was the prop passed" — `useSelfFetchList`
 * uses the latter. The difference only shows for `:objects="[]"` alongside a
 * source, where the source wins; that is the useful reading of an empty array
 * next to an explicit source name.
 *
 * @param {object} props The CnIndexPage props.
 *
 * @return {object} { isNamedSource, namedSource, namedRows, namedLoading }
 */
export function useNamedSource(props) {
	const objectsProvided = !!(props.objects && props.objects.length > 0)
	const isNamedSource = !!props.source && !objectsProvided

	if (!isNamedSource) {
		return {
			isNamedSource: false,
			namedSource: null,
			namedRows: computed(() => []),
			namedLoading: computed(() => false),
		}
	}

	const source = resolveIndexSource(props.source)

	// An unknown source name resolves to null and was already warned about.
	// The page then behaves as an empty index rather than throwing.
	if (!source) {
		return {
			isNamedSource: true,
			namedSource: null,
			namedRows: computed(() => []),
			namedLoading: computed(() => false),
		}
	}

	onMounted(async () => {
		try {
			await source.load(props.sourceConfig || {})
		} catch (error) {
			// Surfaced, not swallowed: a failed load and an empty source look
			// identical in the table, and only one of them is a problem.
			console.error(`[CnIndexPage] source "${props.source}" failed to load`, error)
		}
	})

	// No manual invalidation tick here on purpose. The adapters read from a
	// reactive store, so a computed that calls into them tracks it the ordinary
	// way. A hand-cranked counter would REPLACE that reactivity rather than add
	// to it, and would then miss every update that did not go through load() —
	// a flow renamed in the editor, for instance.
	return {
		isNamedSource: true,
		namedSource: source,
		namedRows: computed(() => source.rows() || []),
		namedLoading: computed(() => source.loading()),
	}
}
