<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-quicklinks-widget-form">
		<div class="cn-quicklinks-widget-form__settings">
			<NcSelect
				:model-value="iconSize"
				:options="iconSizeOptions"
				:input-label="t('nextcloud-vue', 'Icon size')"
				:reduce="(option) => option.value"
				label="label"
				:clearable="false"
				@update:modelValue="updateOption('iconSize', $event)" />

			<NcSelect
				:model-value="iconShape"
				:options="iconShapeOptions"
				:input-label="t('nextcloud-vue', 'Icon shape')"
				:reduce="(option) => option.value"
				label="label"
				:clearable="false"
				@update:modelValue="updateOption('iconShape', $event)" />

			<label class="cn-quicklinks-widget-form__checkbox-label">
				<input
					type="checkbox"
					:checked="showLabels"
					@change="updateOption('showLabels', $event.target.checked)">
				{{ t('nextcloud-vue', 'Show labels') }}
			</label>

			<NcSelect
				:model-value="labelPosition"
				:options="labelPositionOptions"
				:input-label="t('nextcloud-vue', 'Label position')"
				:reduce="(option) => option.value"
				label="label"
				:clearable="false"
				:disabled="!showLabels"
				@update:modelValue="updateOption('labelPosition', $event)" />

			<NcSelect
				:model-value="columns"
				:options="columnsOptions"
				:input-label="t('nextcloud-vue', 'Columns')"
				:reduce="(option) => option.value"
				label="label"
				:clearable="false"
				@update:modelValue="updateOption('columns', $event)" />

			<NcSelect
				:model-value="tileBackgroundStyle"
				:options="tileBackgroundOptions"
				:input-label="t('nextcloud-vue', 'Tile background')"
				:reduce="(option) => option.value"
				label="label"
				:clearable="false"
				@update:modelValue="updateOption('tileBackgroundStyle', $event)" />

			<NcSelect
				:model-value="hoverEffect"
				:options="hoverEffectOptions"
				:input-label="t('nextcloud-vue', 'Hover effect')"
				:reduce="(option) => option.value"
				label="label"
				:clearable="false"
				@update:modelValue="updateOption('hoverEffect', $event)" />
		</div>

		<div class="cn-quicklinks-widget-form__links">
			<table class="cn-quicklinks-widget-form__table">
				<thead>
					<tr>
						<th>{{ t('nextcloud-vue', 'Label') }}</th>
						<th>{{ t('nextcloud-vue', 'URL') }}</th>
						<th>{{ t('nextcloud-vue', 'Icon') }}</th>
						<th v-if="showColorColumn">
							{{ t('nextcloud-vue', 'Color (optional)') }}
						</th>
						<th />
					</tr>
				</thead>
				<tbody>
					<tr
						v-for="(link, index) in links"
						:key="index"
						class="cn-quicklinks-widget-form__row">
						<td>
							<input
								v-model="link.label"
								type="text"
								class="cn-quicklinks-widget-form__input"
								:placeholder="t('nextcloud-vue', 'Label')"
								@input="onContentChange">
						</td>
						<td>
							<input
								v-model="link.url"
								type="text"
								class="cn-quicklinks-widget-form__input"
								:class="{ 'cn-quicklinks-widget-form__input--invalid': !isLinkUrlValid(link) }"
								:placeholder="'https://...'"
								@input="onContentChange">
							<small
								v-if="!isLinkUrlValid(link)"
								class="cn-quicklinks-widget-form__inline-error">
								{{ t('nextcloud-vue', 'Invalid URL') }}
							</small>
						</td>
						<td>
							<CnIconBrowser
								:value="link.icon"
								allow-url
								@input="(v) => { link.icon = v; onContentChange() }" />
						</td>
						<td v-if="showColorColumn">
							<CnColorPicker
								:value="link.color"
								clearable
								@input="onLinkColor(index, $event.hex)"
								@clear="onLinkColor(index, '')" />
						</td>
						<td>
							<button
								type="button"
								class="cn-quicklinks-widget-form__row-action"
								:aria-label="t('nextcloud-vue', 'Delete link')"
								@click="removeLink(index)">
								&times;
							</button>
						</td>
					</tr>
				</tbody>
			</table>

			<div class="cn-quicklinks-widget-form__row-actions">
				<button
					type="button"
					class="cn-quicklinks-widget-form__add"
					@click="addLink">
					+ {{ t('nextcloud-vue', 'Add link') }}
				</button>
			</div>

			<details class="cn-quicklinks-widget-form__bulk">
				<summary>{{ t('nextcloud-vue', 'Paste CSV (label,url)') }}</summary>
				<textarea
					v-model="csvDraft"
					class="cn-quicklinks-widget-form__bulk-input"
					rows="4"
					:placeholder="'Docs,https://docs.example.com\nFiles,/apps/files'" />
				<button
					type="button"
					class="cn-quicklinks-widget-form__bulk-apply"
					@click="applyBulkAdd">
					{{ t('nextcloud-vue', 'Add link') }}
				</button>
			</details>
		</div>
	</div>
</template>

<script>
import { NcSelect } from '@nextcloud/vue'
import { translate as t } from '@nextcloud/l10n'
import CnIconBrowser from '../CnIconBrowser/CnIconBrowser.vue'
import CnColorPicker from '../CnColorPicker/CnColorPicker.vue'
import { sanitiseUrl, validateUrl } from '../../utils/widgetUrl.js'

const DEFAULT_CONTENT = Object.freeze({
	links: [],
	iconSize: 'medium',
	iconShape: 'rounded',
	showLabels: true,
	labelPosition: 'below',
	columns: 'auto',
	tileBackgroundStyle: 'transparent',
	hoverEffect: 'lift',
})

/**
 * CnQuicklinksWidgetForm — the `CnAddWidgetModal` sub-form for the
 * `quicklinks` widget type (renderer: `CnQuicklinksWidget`).
 *
 * Layout: a dropdown grid for the eight widget-level fields, an editable
 * table of links (label / URL / icon / colour), and a collapsible CSV
 * bulk-add textarea. `assembledContent` sanitises each URL so a hostile paste
 * (`javascript:`, `data:`) is dropped before reaching the backend.
 * `validate()` returns an error when any link has an empty or invalid URL.
 */
export default {
	name: 'CnQuicklinksWidgetForm',

	components: {
		NcSelect,
		CnIconBrowser,
		CnColorPicker,
	},

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
		 * Initial content values — used when not editing.
		 *
		 * @type {object}
		 */
		value: {
			type: Object,
			default: () => ({ ...DEFAULT_CONTENT, links: [] }),
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
		const rawLinks = Array.isArray(initial.links) ? initial.links : []
		return {
			links: rawLinks.map((link) => ({
				label: typeof link?.label === 'string' ? link.label : '',
				url: typeof link?.url === 'string' ? link.url : '',
				icon: typeof link?.icon === 'string' ? link.icon : '',
				color: typeof link?.color === 'string' ? link.color : '',
				openInNewTab: typeof link?.openInNewTab === 'boolean' ? link.openInNewTab : undefined,
			})),
			iconSize: initial.iconSize ?? DEFAULT_CONTENT.iconSize,
			iconShape: initial.iconShape ?? DEFAULT_CONTENT.iconShape,
			showLabels: typeof initial.showLabels === 'boolean' ? initial.showLabels : DEFAULT_CONTENT.showLabels,
			labelPosition: initial.labelPosition ?? DEFAULT_CONTENT.labelPosition,
			columns: initial.columns ?? DEFAULT_CONTENT.columns,
			tileBackgroundStyle: initial.tileBackgroundStyle ?? DEFAULT_CONTENT.tileBackgroundStyle,
			hoverEffect: initial.hoverEffect ?? DEFAULT_CONTENT.hoverEffect,
			csvDraft: '',
		}
	},

	computed: {
		/** Icon-size select options. */
		iconSizeOptions() {
			return [
				{ value: 'small', label: t('nextcloud-vue', 'Small') },
				{ value: 'medium', label: t('nextcloud-vue', 'Medium') },
				{ value: 'large', label: t('nextcloud-vue', 'Large') },
				{ value: 'xlarge', label: t('nextcloud-vue', 'Extra large') },
			]
		},
		/** Icon-shape select options. */
		iconShapeOptions() {
			return [
				{ value: 'square', label: t('nextcloud-vue', 'Square') },
				{ value: 'rounded', label: t('nextcloud-vue', 'Rounded') },
				{ value: 'circle', label: t('nextcloud-vue', 'Circle') },
			]
		},
		/** Label-position select options. */
		labelPositionOptions() {
			return [
				{ value: 'below', label: t('nextcloud-vue', 'Below') },
				{ value: 'overlay', label: t('nextcloud-vue', 'Overlay') },
			]
		},
		/** Column-count select options (`auto` + 1..12). */
		columnsOptions() {
			const list = [{ value: 'auto', label: t('nextcloud-vue', 'Auto') }]
			for (let i = 1; i <= 12; i += 1) {
				list.push({ value: i, label: String(i) })
			}
			return list
		},
		/** Tile-background select options. */
		tileBackgroundOptions() {
			return [
				{ value: 'transparent', label: t('nextcloud-vue', 'Transparent') },
				{ value: 'solid', label: t('nextcloud-vue', 'Solid') },
				{ value: 'gradient', label: t('nextcloud-vue', 'Gradient') },
			]
		},
		/** Hover-effect select options. */
		hoverEffectOptions() {
			return [
				{ value: 'lift', label: t('nextcloud-vue', 'Lift') },
				{ value: 'fade', label: t('nextcloud-vue', 'Fade') },
				{ value: 'border', label: t('nextcloud-vue', 'Border') },
				{ value: 'none', label: t('nextcloud-vue', 'None') },
			]
		},
		/** Whether the per-link colour column is shown (solid tiles only). */
		showColorColumn() {
			return this.tileBackgroundStyle === 'solid'
		},
		/** The full content blob assembled from the current field values. */
		assembledContent() {
			return {
				links: this.links.map((link) => {
					const out = {
						label: link.label,
						url: sanitiseUrl(link.url),
						icon: link.icon,
					}
					if (typeof link.color === 'string' && link.color !== '') {
						out.color = link.color
					}
					if (typeof link.openInNewTab === 'boolean') {
						out.openInNewTab = link.openInNewTab
					}
					return out
				}),
				iconSize: this.iconSize,
				iconShape: this.iconShape,
				showLabels: this.showLabels,
				labelPosition: this.labelPosition,
				columns: this.columns,
				tileBackgroundStyle: this.tileBackgroundStyle,
				hoverEffect: this.hoverEffect,
			}
		},
	},

	methods: {
		t,

		/**
		 * Set a widget-level option and notify the parent.
		 *
		 * @param {string} field the option key.
		 * @param {*} value the new value.
		 * @return {void}
		 */
		updateOption(field, value) {
			this[field] = value
			this.$emit('update:content', this.assembledContent)
		},

		/**
		 * Re-emit the assembled content on any link-field edit.
		 *
		 * @return {void}
		 */
		onContentChange() {
			this.$emit('update:content', this.assembledContent)
		},

		/**
		 * Set a link's icon from the CnIconBrowser and re-emit.
		 *
		 * @param {object} link the link row.
		 * @param {string|null} value the chosen icon key/URL.
		 * @return {void}
		 */
		updateLinkIcon(link, value) {
			link.icon = value || ''
			this.onContentChange()
		},

		/**
		 * Set a per-link colour and notify the parent.
		 *
		 * @param {number} index the link index.
		 * @param {string} value the colour value.
		 * @return {void}
		 */
		onLinkColor(index, value) {
			if (this.links[index]) {
				this.links[index] = { ...this.links[index], color: value }
			}
			this.onContentChange()
		},

		/**
		 * Append a new empty link row.
		 *
		 * @return {void}
		 */
		addLink() {
			this.links.push({ label: '', url: '', icon: '', color: '' })
			this.onContentChange()
		},

		/**
		 * Remove a link row by index.
		 *
		 * @param {number} index the link index.
		 * @return {void}
		 */
		removeLink(index) {
			this.links.splice(index, 1)
			this.onContentChange()
		},

		/**
		 * Whether a link's URL is valid (empty is treated as neutral while
		 * the user is still typing).
		 *
		 * @param {object} link the link entry.
		 * @return {boolean} true when valid or empty.
		 */
		isLinkUrlValid(link) {
			if (typeof link?.url !== 'string' || link.url === '') {
				return true
			}
			return validateUrl(link.url)
		},

		/**
		 * Parse and append CSV rows from the bulk-add textarea.
		 *
		 * @return {void}
		 */
		applyBulkAdd() {
			const draft = (this.csvDraft || '').trim()
			if (draft === '') {
				return
			}
			const newLinks = this.parseCsv(draft)
			if (newLinks.length === 0) {
				return
			}
			this.links.push(...newLinks)
			this.csvDraft = ''
			this.onContentChange()
		},

		/**
		 * Parse `label,url` CSV lines into link objects (first comma splits).
		 *
		 * @param {string} input the raw CSV text.
		 * @return {Array<object>} the parsed links.
		 */
		parseCsv(input) {
			const out = []
			const rows = input.split(/\r?\n/)
			for (const raw of rows) {
				const line = raw.trim()
				if (line === '') {
					continue
				}
				const commaIdx = line.indexOf(',')
				if (commaIdx === -1) {
					continue
				}
				const label = line.slice(0, commaIdx).trim()
				const url = line.slice(commaIdx + 1).trim()
				if (label === '' || url === '') {
					continue
				}
				out.push({ label, url, icon: '', color: '' })
			}
			return out
		},

		/**
		 * Validate the form; an empty array means valid. Returns an error
		 * when any link has an empty or invalid URL.
		 *
		 * @return {string[]} the validation errors.
		 */
		validate() {
			const errors = []
			for (let i = 0; i < this.links.length; i += 1) {
				const link = this.links[i]
				if (typeof link?.url !== 'string' || link.url.trim() === '') {
					errors.push(t('nextcloud-vue', 'Invalid URL in one or more links'))
					return errors
				}
				if (!validateUrl(link.url)) {
					errors.push(t('nextcloud-vue', 'Invalid URL in one or more links'))
					return errors
				}
			}
			return errors
		},
	},
}
</script>

<style scoped>
.cn-quicklinks-widget-form {
	display: flex;
	flex-direction: column;
	gap: 16px;
}

.cn-quicklinks-widget-form__settings {
	display: grid;
	grid-template-columns: repeat(2, 1fr);
	gap: 12px;
}

.cn-quicklinks-widget-form__checkbox-label {
	display: flex;
	align-items: center;
	gap: 8px;
	font-size: 14px;
}

.cn-quicklinks-widget-form__links {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.cn-quicklinks-widget-form__table {
	width: 100%;
	border-collapse: collapse;
}

.cn-quicklinks-widget-form__table th,
.cn-quicklinks-widget-form__table td {
	padding: 4px;
	font-size: 13px;
	text-align: left;
	vertical-align: top;
}

.cn-quicklinks-widget-form__input {
	width: 100%;
	padding: 6px 8px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	font-size: 13px;
	background: var(--color-main-background);
	color: var(--color-main-text);
	box-sizing: border-box;
}

.cn-quicklinks-widget-form__input--invalid {
	border-color: var(--color-error, #d32f2f);
}

.cn-quicklinks-widget-form__inline-error {
	display: block;
	color: var(--color-error, #d32f2f);
	font-size: 11px;
	margin-top: 2px;
}

.cn-quicklinks-widget-form__color {
	width: 32px;
	height: 24px;
	padding: 0;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	cursor: pointer;
	background: transparent;
}

.cn-quicklinks-widget-form__row-action,
.cn-quicklinks-widget-form__add,
.cn-quicklinks-widget-form__bulk-apply {
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	background: var(--color-background-hover);
	color: var(--color-main-text);
	cursor: pointer;
	padding: 4px 10px;
	font-size: 13px;
}

.cn-quicklinks-widget-form__bulk {
	border: 1px dashed var(--color-border);
	border-radius: var(--border-radius);
	padding: 8px;
}

.cn-quicklinks-widget-form__bulk-input {
	width: 100%;
	padding: 6px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	font-family: monospace;
	font-size: 12px;
	box-sizing: border-box;
	margin-bottom: 8px;
}
</style>
