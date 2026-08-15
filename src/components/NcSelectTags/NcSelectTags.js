/**
 * SPDX-FileCopyrightText: 2026 Conduction b.v.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Drop-in override for @nextcloud/vue's NcSelectTags, re-exported from the
 * barrel (src/index.js) so it shadows the upstream component for every
 * consumer app.
 *
 * It fixes two upstream problems that surface across LaunchPad and OpenCatalogi:
 *
 *  1. The systemtags fetch crashes on instances with zero (or one) system tags
 *     — its multistatus parser assumes `d:response` is always an array. We
 *     replace it with {@link searchSystemTags}, which tolerates the single
 *     response shape and yields an empty list instead of logging
 *     "Loading systemtags failed". (See searchSystemTags.js for the detail.)
 *
 *  2. Upstream ignores consumer-supplied `:options` whenever `fetchTags` is
 *     true (its default), so every call site that passes a custom option list
 *     (e.g. a list of groups) silently gets system tags instead. In practice
 *     every consumer that passes `:options` wants exactly those shown, so here
 *     a non-empty `:options` always wins and no fetch happens.
 *
 * We `extends` the upstream component so all of its props, slots, v-model
 * wiring and rendering are inherited unchanged — only the data source is
 * corrected.
 */

import { NcSelectTags as UpstreamNcSelectTags } from '@nextcloud/vue'

import { searchSystemTags } from './searchSystemTags.js'

export default {
	name: 'NcSelectTags',

	extends: UpstreamNcSelectTags,

	props: {
		/**
		 * Default the upstream auto-fetch OFF. Upstream's own `created()` hook
		 * (which still runs, merged before ours) early-returns when this is
		 * false, so its buggy parser never executes. We do the fetch ourselves
		 * below with a tolerant parser.
		 */
		fetchTags: {
			type: Boolean,
			default: false,
		},
	},

	data() {
		return {
			// Tags fetched via the tolerant parser; null until the fetch settles.
			cnFetchedTags: null,
		}
	},

	computed: {
		/**
		 * Override upstream `tags`: consumer-supplied `:options` always win;
		 * otherwise surface the system tags we fetched ourselves.
		 *
		 * @return {Array<object>} The option list to render.
		 */
		tags() {
			if (Array.isArray(this.options) && this.options.length > 0) {
				return this.options
			}
			return this.cnFetchedTags ?? []
		},
	},

	async created() {
		// `fetchTags` exists only for upstream compatibility — this override
		// always fetches itself (via the tolerant parser) when no `:options`
		// are given. Setting it `true` doesn't change our result, but upstream's
		// own merged `created()` runs first and re-invokes its broken parser,
		// producing a wasted PROPFIND and a misleading "Loading systemtags
		// failed" console error. We can't suppress the parent hook, so warn.
		if (this.fetchTags === true && process.env.NODE_ENV !== 'production') {
			console.warn('[NcSelectTags] `fetchTags` is unnecessary on this override and re-triggers upstream\'s broken systemtags parser (a harmless but logged "Loading systemtags failed" error). Remove the prop: system tags are fetched automatically when no `:options` are provided.')
		}

		// Consumer provided their own options — nothing to fetch.
		if (Array.isArray(this.options) && this.options.length > 0) {
			return
		}
		try {
			this.cnFetchedTags = await searchSystemTags()
		} catch (error) {
			this.cnFetchedTags = []
		}
	},
}
