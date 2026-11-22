<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-app-tile-widget-form">
		<NcSelect
			:modelValue="selectedApp"
			:options="apps"
			label="label"
			:inputLabel="t('nextcloud-vue', 'App')"
			:clearable="false"
			:loading="loading"
			data-testid="cn-app-tile-form-app"
			@update:modelValue="updateField('appId', $event ? $event.id : '')" />
		<fieldset class="cn-app-tile-widget-form__colours">
			<legend>{{ t('nextcloud-vue', 'Colour') }}</legend>
			<label
				v-for="option in colours"
				:key="option.key"
				class="cn-app-tile-widget-form__swatch"
				:style="{ '--cn-app-tile-swatch': option.value }"
				:title="option.label">
				<input
					type="radio"
					name="cn-app-tile-colour"
					:value="option.key"
					:checked="effectiveColour === option.key"
					:aria-label="option.label"
					:data-testid="`cn-app-tile-form-colour-${option.key}`"
					@change="updateField('colour', option.key)">
			</label>
		</fieldset>
		<NcCheckboxRadioSwitch
			:modelValue="showCount"
			type="switch"
			@update:modelValue="updateField('showCount', $event)">
			{{ t('nextcloud-vue', 'Show the number of new items') }}
		</NcCheckboxRadioSwitch>
	</div>
</template>

<script>
import axios from '@nextcloud/axios'
import { translate as t } from '@nextcloud/l10n'
import { NcCheckboxRadioSwitch, NcSelect } from '@nextcloud/vue'
import { APP_TILE_COLOURS, appTileColourValue, defaultAppTileColour } from '../../utils/appTilePalette.js'
import { navigationApps } from '../../utils/nextcloudApps.js'

/**
 * CnAppTileWidgetForm: the `CnAddWidgetModal` sub-form for an `app-tile`
 * placement: which app of the reader's navigation it opens, its colour from
 * the app tile palette, and whether it shows the number of new items.
 *
 * @spec openspec/changes/app-tile/specs/app-tile/spec.md
 */
export default {
	name: 'CnAppTileWidgetForm',

	components: { NcCheckboxRadioSwitch, NcSelect },

	props: {
		/**
		 * The placement being edited, or `null` in create mode.
		 *
		 * @type {{content: object}|null}
		 */
		editingWidget: {
			type: Object,
			default: null,
		},

		/**
		 * Initial content values when not editing.
		 *
		 * @type {object}
		 */
		value: {
			type: Object,
			default: () => ({}),
		},
	},

	emits: [
		/**
		 * Emitted with the assembled content blob on every field change.
		 *
		 * @event update:content
		 * @type {object}
		 */
		'update:content',
	],

	data() {
		const initial = this.editingWidget?.content || this.value || {}
		return {
			appId: String(initial.appId || ''),
			colour: String(initial.colour || ''),
			showCount: initial.showCount !== false,
			rest: initial,
			apps: [],
			loading: true,
		}
	},

	computed: {
		/** @return {object|null} The chosen app's option. */
		selectedApp() {
			return this.apps.find((app) => app.id === this.appId) || null
		},

		/** @return {string} The colour the tile draws in. */
		effectiveColour() {
			return this.colour || defaultAppTileColour(this.appId)
		},

		/** @return {Array<{key: string, label: string, value: string}>} The palette, labelled. */
		colours() {
			return APP_TILE_COLOURS.map((colour) => ({
				key: colour.key,
				label: t('nextcloud-vue', colour.label),
				value: appTileColourValue(colour.key),
			}))
		},

		/** @return {object} The content blob from the fields. */
		assembledContent() {
			return {
				...this.rest,
				appId: this.appId,
				colour: this.colour,
				showCount: this.showCount,
			}
		},
	},

	async mounted() {
		try {
			this.apps = await navigationApps(axios)
		} finally {
			this.loading = false
		}
	},

	methods: {
		t,

		/**
		 * Set a field and notify the parent via `update:content`.
		 *
		 * @param {string} field One of: appId, colour, showCount.
		 * @param {string|boolean} value The new value.
		 * @return {void}
		 */
		updateField(field, value) {
			this[field] = value
			this.$emit('update:content', this.assembledContent)
		},

		/**
		 * Validate the form: the tile needs an app.
		 *
		 * @return {string[]} The validation errors.
		 */
		validate() {
			return this.appId === '' ? [t('nextcloud-vue', 'Choose the app this tile opens')] : []
		},
	},
}
</script>

<style scoped>
.cn-app-tile-widget-form {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.cn-app-tile-widget-form__colours {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
	margin: 0;
	padding: 0;
	border: 0;
}

.cn-app-tile-widget-form__colours legend {
	margin-bottom: 4px;
}

.cn-app-tile-widget-form__swatch {
	display: inline-flex;
	width: 32px;
	height: 32px;
	border-radius: var(--border-radius, 8px);
	background-color: var(--cn-app-tile-swatch);
	cursor: pointer;
}

.cn-app-tile-widget-form__swatch input {
	width: 100%;
	height: 100%;
	margin: 0;
	opacity: 0;
	cursor: pointer;
}

.cn-app-tile-widget-form__swatch:has(input:checked) {
	outline: 3px solid var(--color-main-text, #000);
	outline-offset: 2px;
}

.cn-app-tile-widget-form__swatch:has(input:focus-visible) {
	box-shadow: 0 0 0 2px var(--color-main-background, #fff), 0 0 0 4px var(--color-primary-element);
}
</style>
