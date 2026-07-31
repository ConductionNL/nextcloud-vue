<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-nc-widget-grid-picker">
		<div
			v-if="normalisedWidgets.length === 0"
			class="cn-nc-widget-grid-picker__empty">
			{{ t('nextcloud-vue', 'No Nextcloud widgets are installed') }}
		</div>
		<div
			v-else
			ref="grid"
			class="cn-nc-widget-grid-picker__grid"
			role="radiogroup"
			:aria-label="t('nextcloud-vue', 'Pick a widget')">
			<button
				v-for="(widget, idx) in normalisedWidgets"
				:key="widget.id"
				ref="cards"
				type="button"
				role="radio"
				:aria-checked="value === widget.id ? 'true' : 'false'"
				:aria-label="widget.title"
				:tabindex="cardTabIndex(widget.id, idx)"
				class="cn-nc-widget-grid-picker__card"
				:class="{ 'cn-nc-widget-grid-picker__card--selected': value === widget.id }"
				@click="select(widget.id)"
				@keydown="onKeydown($event, idx)"
				@focus="focusedIndex = idx">
				<span class="cn-nc-widget-grid-picker__icon-wrap">
					<img
						v-if="widget.iconUrl"
						class="cn-nc-widget-grid-picker__icon"
						:src="widget.iconUrl"
						:alt="''"
						aria-hidden="true">
					<span
						v-else
						class="cn-nc-widget-grid-picker__icon cn-nc-widget-grid-picker__icon--placeholder"
						aria-hidden="true">
						{{ initialsFor(widget.title) }}
					</span>
					<span
						v-if="value === widget.id"
						class="cn-nc-widget-grid-picker__check"
						:aria-label="t('nextcloud-vue', 'Selected')">
						<CheckIcon :size="16" />
					</span>
				</span>
				<span class="cn-nc-widget-grid-picker__title">{{ widget.title }}</span>
			</button>
		</div>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import CheckIcon from 'vue-material-design-icons/Check.vue'

/**
 * CnNcWidgetGridPicker renders the Nextcloud-discovered widget catalog as a
 * responsive CSS-grid of icon cards. Each card carries the widget's icon,
 * single-line ellipsised title, and shows a selected-state border + check
 * overlay when active.
 *
 * `v-model` exposes the widget id (string) — the same shape a `<select>` would
 * use so the parent form's `update:content` payload is unchanged.
 *
 * Keyboard:
 *  - Arrow keys move focus across the grid (tabindex rotation: focused card
 *    has tabindex="0", others "-1").
 *  - Enter / Space on a focused card selects it.
 *  - Tab moves focus out of the grid (no card-to-card Tab).
 *
 * @spec openspec/changes/cn-widget-library/specs/cn-widget-library/spec.md
 */
export default {
	name: 'CnNcWidgetGridPicker',

	components: { CheckIcon },

	// NO `model: { prop, event }` OPTION.
	//
	// The Vue-2 `model` option is REMOVED in Vue 3 — it is read by nothing and
	// warns about nothing, so it survived the migration here as a declaration
	// that looked authoritative while doing exactly zero. Vue 3 desugars a bare
	// `v-model` on this component to `:modelValue` + `@update:modelValue`,
	// neither of which it declares, which is why `CnNcDashboardWidgetForm`
	// binds `:value` + `@input` explicitly (see the comment at that call site).
	// Surfaced by `vue/no-deprecated-model-definition`, which this repo now
	// arms through its own published preset.

	props: {
		/** The currently-selected widget id. Bind `:value` + `@input` explicitly — Vue 3 does not desugar a bare `v-model` onto this pair. */
		value: {
			type: String,
			default: '',
		},
		/**
		 * The Nextcloud-discovered widgets to pick from. Accepts an array or an
		 * object map (PHP may serialise a sequential array as an object).
		 *
		 * @type {Array<{id: string, title?: string, iconUrl?: string}>|object}
		 */
		widgets: {
			type: [Array, Object],
			default: () => [],
		},
	},

	emits: [
		/** Selection changed; payload is the selected widget id string. */
		'input',
	],

	data() {
		return {
			focusedIndex: 0,
		}
	},

	computed: {
		/**
		 * The defensively-normalised widget list (filters out malformed
		 * entries and coerces an object map to an array).
		 *
		 * @return {Array<{id: string, title: string, iconUrl: string}>} the clean widget list.
		 */
		normalisedWidgets() {
			const list = Array.isArray(this.widgets)
				? this.widgets
				: (this.widgets && typeof this.widgets === 'object'
					? Object.values(this.widgets)
					: [])
			return list
				.filter((w) => w && typeof w.id === 'string' && w.id !== '')
				.map((w) => ({
					id: w.id,
					title: w.title || w.id,
					iconUrl: typeof w.iconUrl === 'string' && w.iconUrl !== '' ? w.iconUrl : '',
				}))
		},

		/**
		 * The index of the currently-selected widget within the normalised
		 * list, or `-1` when nothing is selected.
		 *
		 * @return {number} the selected index.
		 */
		selectedIndex() {
			return this.normalisedWidgets.findIndex((w) => w.id === this.value)
		},
	},

	methods: {
		t,

		/**
		 * Compute the roving tabindex for a card: the selected card (or the
		 * first card when none is selected) is the keyboard entry point.
		 *
		 * @param {string} id the widget id.
		 * @param {number} idx the card index.
		 * @return {number} `0` for the entry-point card, `-1` otherwise.
		 */
		cardTabIndex(id, idx) {
			if (this.selectedIndex >= 0) {
				return this.selectedIndex === idx ? 0 : -1
			}
			return idx === 0 ? 0 : -1
		},

		/**
		 * Select a widget, emitting the `input` (`v-model`) event.
		 *
		 * @param {string} id the widget id to select.
		 * @return {void}
		 */
		select(id) {
			this.$emit('input', id)
		},

		/**
		 * Compute up-to-two-letter initials for the placeholder icon.
		 *
		 * @param {string} title the widget title.
		 * @return {string} the uppercased initials.
		 */
		initialsFor(title) {
			if (typeof title !== 'string' || title.length === 0) {
				return '?'
			}
			const parts = title.split(/\s+/).filter(Boolean)
			if (parts.length === 1) {
				return parts[0].slice(0, 2).toUpperCase()
			}
			return (parts[0][0] + parts[1][0]).toUpperCase()
		},

		/**
		 * Keyboard navigation handler — arrows move focus, Enter/Space select.
		 *
		 * @param {KeyboardEvent} event the keydown event.
		 * @param {number} idx the focused card index.
		 * @return {void}
		 */
		onKeydown(event, idx) {
			const total = this.normalisedWidgets.length
			if (total === 0) {
				return
			}

			const key = event.key
			if (key === 'Enter' || key === ' ' || key === 'Spacebar') {
				event.preventDefault()
				this.select(this.normalisedWidgets[idx].id)
				return
			}

			let nextIdx = -1
			if (key === 'ArrowRight' || key === 'ArrowDown') {
				nextIdx = (idx + 1) % total
			} else if (key === 'ArrowLeft' || key === 'ArrowUp') {
				nextIdx = (idx - 1 + total) % total
			} else if (key === 'Home') {
				nextIdx = 0
			} else if (key === 'End') {
				nextIdx = total - 1
			}

			if (nextIdx === -1) {
				return
			}
			event.preventDefault()
			this.focusedIndex = nextIdx
			this.$nextTick(() => {
				const cards = this.$refs.cards
				if (Array.isArray(cards) && cards[nextIdx]) {
					cards[nextIdx].focus()
				}
			})
		},
	},
}
</script>

<style scoped>
.cn-nc-widget-grid-picker__grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
	gap: 12px;
}

.cn-nc-widget-grid-picker__card {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 8px;
	padding: 12px 8px;
	border: 2px solid var(--color-border);
	border-radius: var(--border-radius-large, var(--border-radius));
	background: var(--color-main-background);
	color: var(--color-main-text);
	cursor: pointer;
	min-height: 96px;
	transition: border-color 0.12s ease-in-out, background-color 0.12s ease-in-out;
}

.cn-nc-widget-grid-picker__card:hover {
	background: var(--color-background-hover);
}

.cn-nc-widget-grid-picker__card:focus {
	outline: 2px solid var(--color-primary-element);
	outline-offset: 2px;
}

.cn-nc-widget-grid-picker__card--selected {
	border-color: var(--color-primary-element);
}

.cn-nc-widget-grid-picker__icon-wrap {
	position: relative;
	width: 40px;
	height: 40px;
	display: flex;
	align-items: center;
	justify-content: center;
}

.cn-nc-widget-grid-picker__icon {
	width: 40px;
	height: 40px;
	object-fit: contain;
	display: block;
}

.cn-nc-widget-grid-picker__icon--placeholder {
	border-radius: 50%;
	background: var(--color-background-dark);
	color: var(--color-main-text);
	font-size: 14px;
	font-weight: 600;
	display: flex;
	align-items: center;
	justify-content: center;
}

.cn-nc-widget-grid-picker__check {
	position: absolute;
	bottom: -4px;
	right: -4px;
	width: 20px;
	height: 20px;
	border-radius: 50%;
	background: var(--color-primary-element);
	color: var(--color-primary-element-text);
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 0 0 2px var(--color-main-background);
}

.cn-nc-widget-grid-picker__title {
	width: 100%;
	font-size: 13px;
	text-align: center;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.cn-nc-widget-grid-picker__empty {
	padding: 16px;
	text-align: center;
	color: var(--color-text-maxcontrast);
	font-style: italic;
}
</style>
