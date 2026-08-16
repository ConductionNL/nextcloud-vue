<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<form
		class="ac-search-box ac-search-box--home"
		role="search"
		:aria-label="label"
		@submit.prevent="submit">
		<!--
			A LABEL, not just a placeholder. A placeholder disappears the moment
			the field has content and is not reliably announced, so a
			placeholder-only search box leaves a screen-reader user with an
			unnamed text input. Visually hidden, because the design shows the
			prompt as the band's heading instead.
		-->
		<label class="ac-search-box__label sr-only" :for="inputId">
			{{ label }}
		</label>

		<div class="ac-search-box__search">
			<input
				:id="inputId"
				v-model="term"
				type="text"
				name="q"
				class="ac-search-box__input"
				:placeholder="placeholder"
				autocomplete="off">
			<button type="submit" class="ac-search-box__button">
				{{ submitLabel }}
			</button>
		</div>
	</form>
</template>

<script>
/**
 * The site search box.
 *
 * Emits `search` with the term and does NOT fetch anything itself. A block
 * that owned its own transport could only ever work against one back end,
 * which is the opposite of what a shared library is for — the host decides
 * where a query goes.
 *
 * It is a real `<form>` with a submit button so that Enter works and the
 * control is reachable and operable by keyboard without any script.
 *
 * PUBLIC-SAFE (see ../index.js): no `@nextcloud/*` import. Labels arrive as
 * props rather than through `t()`, because the translation layer is exactly
 * the dependency that makes a component unusable outside Nextcloud.
 */
export default {
	name: 'CnSiteSearch',

	props: {
		/** Accessible name for the search landmark and its input. */
		label: {
			type: String,
			default: 'Zoeken',
		},

		/** Placeholder shown inside the field. */
		placeholder: {
			type: String,
			default: '',
		},

		/** Visible text on the submit button. */
		submitLabel: {
			type: String,
			default: 'Zoeken',
		},

		/** Pre-filled term, so a results page can round-trip the query. */
		value: {
			type: String,
			default: '',
		},

		/** DOM id for the input, so the label can reference it. */
		inputId: {
			type: String,
			default: 'cn-site-search',
		},
	},

	emits: ['search'],

	data() {
		return {
			term: this.value,
		}
	},

	watch: {
		value(next) {
			this.term = next
		},
	},

	methods: {
		/**
		 * Hand the term to the host.
		 *
		 * @return {void}
		 */
		submit() {
			this.$emit('search', this.term)
		},
	},
}
</script>
