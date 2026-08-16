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
			unnamed text input.

			VISIBLE BY DEFAULT when the host asks for it, because on the NL
			Design System reference the prompt IS this label — measured on its
			home page, the hero contains no heading element at all and the
			question sits inside the form. Hiding it there would delete the only
			visible prompt on the band.
		-->
		<!--
			Class names captured from the running reference rather than guessed —
			`utrecht-form-label`, `utrecht-textbox--html-input` and
			`utrecht-button--primary-action` are what the design system's CSS
			actually selects on. Without the primary-action modifier the submit
			button renders as the SUBTLE variant: measured, transparent
			background and rgb(10, 39, 80) text where the design wants a filled
			rgb(0, 68, 136) button with white text.
		-->
		<div class="ac-flex ac-flex--column ac-flex--spacing-sm">
			<label :class="labelClass" :for="inputId">
				{{ label }}
			</label>

			<div class="ac-search-box__search">
				<input
					:id="inputId"
					v-model="term"
					type="text"
					name="q"
					class="ac-search-box__input utrecht-textbox utrecht-textbox--html-input"
					:placeholder="placeholder"
					autocomplete="off">
				<button
					type="submit"
					class="ac-search-box__button utrecht-button utrecht-button--submit utrecht-button--primary-action">
					<!--
						DECORATIVE, so `aria-hidden` and no title: the button
						already has a text label beside it, and an icon that
						repeats it is one more thing for a screen reader to read
						out for no gain.
					-->
					<svg
						class="ac-search-box__search-icon"
						width="20"
						height="20"
						viewBox="0 0 20 20"
						fill="none"
						aria-hidden="true"
						focusable="false">
						<path
							d="M8.5 3a5.5 5.5 0 1 0 3.383 9.83l3.643 3.644a.75.75 0 1 0 1.061-1.06l-3.644-3.644A5.5 5.5 0 0 0 8.5 3Zm-4 5.5a4 4 0 1 1 8 0 4 4 0 0 1-8 0Z"
							fill="currentColor" />
					</svg>
					{{ submitLabel }}
				</button>
			</div>
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

		/**
		 * Whether the label is shown or only exposed to assistive tech.
		 *
		 * It is ALWAYS in the DOM either way — this only decides whether it is
		 * painted. A search box whose label is hidden with `display: none`
		 * would be hidden from screen readers too, which is why the hidden
		 * state is a clip-based `sr-only`, not a display toggle.
		 */
		labelVisible: {
			type: Boolean,
			default: false,
		},
	},

	emits: ['search'],

	data() {
		return {
			term: this.value,
		}
	},

	computed: {
		/**
		 * @return {Array} Classes for the label.
		 */
		labelClass() {
			return ['ac-search-box__label', 'utrecht-form-label', this.labelVisible ? null : 'sr-only'].filter(Boolean)
		},
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
