<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-links-form">
		<!-- Sections editor -->
		<div class="cn-links-form__sections">
			<div
				v-for="(section, sIdx) in sections"
				:key="sIdx"
				class="cn-links-form__section">
				<div class="cn-links-form__section-header">
					<input
						type="text"
						class="cn-links-form__section-title"
						:value="section.title"
						:placeholder="t('nextcloud-vue', 'Section title')"
						@input="updateSectionTitle(sIdx, $event.target.value)">
					<div class="cn-links-form__section-actions">
						<button
							type="button"
							class="cn-links-form__btn cn-links-form__btn--small"
							:disabled="sIdx === 0"
							:title="t('nextcloud-vue', 'Move up')"
							@click="moveSection(sIdx, -1)">
							↑
						</button>
						<button
							type="button"
							class="cn-links-form__btn cn-links-form__btn--small"
							:disabled="sIdx === sections.length - 1"
							:title="t('nextcloud-vue', 'Move down')"
							@click="moveSection(sIdx, 1)">
							↓
						</button>
						<button
							type="button"
							class="cn-links-form__btn cn-links-form__btn--danger"
							:title="t('nextcloud-vue', 'Delete section')"
							@click="deleteSection(sIdx)">
							×
						</button>
					</div>
				</div>

				<div class="cn-links-form__links">
					<div
						v-for="(link, lIdx) in section.links"
						:key="lIdx"
						class="cn-links-form__link-row"
						:class="{ 'cn-links-form__link-row--invalid': linkErrors[sIdx] && linkErrors[sIdx][lIdx] }">
						<input
							type="text"
							class="cn-links-form__input"
							:value="link.label"
							:placeholder="t('nextcloud-vue', 'Label')"
							@input="updateLink(sIdx, lIdx, 'label', $event.target.value)">
						<input
							type="text"
							class="cn-links-form__input"
							:value="link.url"
							:placeholder="t('nextcloud-vue', 'URL')"
							@input="updateLink(sIdx, lIdx, 'url', $event.target.value)">
						<CnIconPicker
							compact
							:value="link.icon"
							@input="updateLink(sIdx, lIdx, 'icon', $event || '')" />
						<input
							v-if="showLinkDescriptions"
							type="text"
							class="cn-links-form__input"
							:value="link.description"
							:placeholder="t('nextcloud-vue', 'Description (optional)')"
							@input="updateLink(sIdx, lIdx, 'description', $event.target.value)">
						<button
							type="button"
							class="cn-links-form__btn cn-links-form__btn--small"
							:disabled="lIdx === 0"
							:title="t('nextcloud-vue', 'Move up')"
							@click="moveLink(sIdx, lIdx, -1)">
							↑
						</button>
						<button
							type="button"
							class="cn-links-form__btn cn-links-form__btn--small"
							:disabled="lIdx === section.links.length - 1"
							:title="t('nextcloud-vue', 'Move down')"
							@click="moveLink(sIdx, lIdx, 1)">
							↓
						</button>
						<button
							type="button"
							class="cn-links-form__btn cn-links-form__btn--danger"
							:title="t('nextcloud-vue', 'Delete link')"
							@click="deleteLink(sIdx, lIdx)">
							×
						</button>
					</div>
					<button
						type="button"
						class="cn-links-form__btn cn-links-form__btn--ghost"
						@click="addLink(sIdx)">
						+ {{ t('nextcloud-vue', 'Add link') }}
					</button>
				</div>
			</div>
			<button
				type="button"
				class="cn-links-form__btn cn-links-form__btn--ghost"
				@click="addSection">
				+ {{ t('nextcloud-vue', 'Add section') }}
			</button>
		</div>

		<!-- Layout options panel -->
		<div class="cn-links-form__options">
			<label class="cn-links-form__option">
				<span>{{ t('nextcloud-vue', 'Columns') }}</span>
				<input
					type="number"
					min="1"
					max="6"
					:value="columns"
					class="cn-links-form__input cn-links-form__input--narrow"
					@input="updateOption('columns', clampColumns($event.target.value))">
			</label>

			<label class="cn-links-form__option">
				<span>{{ t('nextcloud-vue', 'Layout') }}</span>
				<select
					:value="linkLayout"
					class="cn-links-form__input"
					@change="updateOption('linkLayout', $event.target.value)">
					<option value="card">{{ t('nextcloud-vue', 'Card') }}</option>
					<option value="inline">{{ t('nextcloud-vue', 'Inline') }}</option>
					<option value="icon-only">{{ t('nextcloud-vue', 'Icon only') }}</option>
				</select>
			</label>

			<label class="cn-links-form__option">
				<span>{{ t('nextcloud-vue', 'Icon size') }}</span>
				<select
					:value="iconSize"
					class="cn-links-form__input"
					@change="updateOption('iconSize', $event.target.value)">
					<option value="small">{{ t('nextcloud-vue', 'Small (24 px)') }}</option>
					<option value="medium">{{ t('nextcloud-vue', 'Medium (40 px)') }}</option>
					<option value="large">{{ t('nextcloud-vue', 'Large (64 px)') }}</option>
				</select>
			</label>

			<label class="cn-links-form__option cn-links-form__option--checkbox">
				<input
					type="checkbox"
					:checked="openInNewTab"
					@change="updateOption('openInNewTab', $event.target.checked)">
				<span>{{ t('nextcloud-vue', 'Open in new tab') }}</span>
			</label>

			<label class="cn-links-form__option cn-links-form__option--checkbox">
				<input
					type="checkbox"
					:checked="showSectionTitles"
					@change="updateOption('showSectionTitles', $event.target.checked)">
				<span>{{ t('nextcloud-vue', 'Show section titles') }}</span>
			</label>

			<label class="cn-links-form__option cn-links-form__option--checkbox">
				<input
					type="checkbox"
					:checked="showLinkDescriptions"
					:disabled="linkLayout !== 'card'"
					@change="updateOption('showLinkDescriptions', $event.target.checked)">
				<span>{{ t('nextcloud-vue', 'Show descriptions') }}</span>
			</label>
		</div>

		<p v-if="firstError" class="cn-links-form__error">
			{{ firstError }}
		</p>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import CnIconPicker from '../CnIconPicker/CnIconPicker.vue'

const VALID_LAYOUTS = Object.freeze(['card', 'inline', 'icon-only'])
const VALID_SIZES = Object.freeze(['small', 'medium', 'large'])

const DEFAULT_CONTENT = Object.freeze({
	sections: [],
	columns: 3,
	linkLayout: 'card',
	iconSize: 'medium',
	openInNewTab: true,
	showSectionTitles: true,
	showLinkDescriptions: true,
})

/**
 * Build an empty link row.
 *
 * @return {{label: string, url: string, icon: string, description: string}} the empty link.
 */
function makeEmptyLink() {
	return { label: '', url: '', icon: '', description: '' }
}

/**
 * Build an empty section with one link.
 *
 * @return {{title: string, links: object[]}} the empty section.
 */
function makeEmptySection() {
	return { title: '', links: [makeEmptyLink()] }
}

/**
 * URL sanitiser — accepts http(s) and root-relative URLs (without `..`).
 *
 * @param {string} url the candidate URL.
 * @return {string|null} an error message, or `null` when valid.
 */
function validateUrl(url) {
	if (typeof url !== 'string' || url.trim() === '') {
		return t('nextcloud-vue', 'Link URL is required')
	}
	const trimmed = url.trim()
	if (trimmed.startsWith('/')) {
		if (trimmed.includes('..')) {
			return t('nextcloud-vue', 'Invalid URL — use HTTP(S) or relative paths.')
		}
		return null
	}
	if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
		return null
	}
	return t('nextcloud-vue', 'Invalid URL — use HTTP(S) or relative paths.')
}

/**
 * CnLinksWidgetForm — sub-form for creating or editing a `links` placement.
 *
 * Edits sections + links inline plus the global layout options (columns,
 * linkLayout, iconSize, openInNewTab, showSectionTitles, showLinkDescriptions).
 * `validate()` runs URL sanitisation and returns a non-empty error array when
 * any link URL is empty or unsafe. Uses up/down arrow buttons for reorder
 * (keyboard-accessible by default).
 *
 * @spec openspec/changes/cn-widget-library/specs/cn-widget-library/spec.md
 */
export default {
	name: 'CnLinksWidgetForm',

	components: {
		CnIconPicker,
	},

	props: {
		/** The placement being edited, or `null` in create mode. */
		editingWidget: {
			type: Object,
			default: null,
		},
		/** Initial content values (registry defaults when not editing). */
		value: {
			type: Object,
			default: () => ({ ...DEFAULT_CONTENT }),
		},
	},

	emits: [
		/**
		 * Emitted on every change with the assembled content payload.
		 *
		 * @type {object}
		 */
		'update:content',
	],

	data() {
		const initial = this.editingWidget?.content || this.value || {}
		return {
			sections: Array.isArray(initial.sections) && initial.sections.length > 0
				? this.cloneSections(initial.sections)
				: [],
			columns: this.clampColumns(initial.columns ?? DEFAULT_CONTENT.columns),
			linkLayout: VALID_LAYOUTS.includes(initial.linkLayout)
				? initial.linkLayout
				: DEFAULT_CONTENT.linkLayout,
			iconSize: VALID_SIZES.includes(initial.iconSize)
				? initial.iconSize
				: DEFAULT_CONTENT.iconSize,
			openInNewTab: initial.openInNewTab === undefined ? DEFAULT_CONTENT.openInNewTab : Boolean(initial.openInNewTab),
			showSectionTitles: initial.showSectionTitles === undefined ? DEFAULT_CONTENT.showSectionTitles : Boolean(initial.showSectionTitles),
			showLinkDescriptions: initial.showLinkDescriptions === undefined ? DEFAULT_CONTENT.showLinkDescriptions : Boolean(initial.showLinkDescriptions),
			linkErrors: [],
			firstError: '',
		}
	},

	computed: {
		/**
		 * The assembled `content` payload emitted to the parent.
		 *
		 * @return {object} the content blob.
		 */
		assembledContent() {
			return {
				sections: this.cloneSections(this.sections),
				columns: this.columns,
				linkLayout: this.linkLayout,
				iconSize: this.iconSize,
				openInNewTab: this.openInNewTab,
				showSectionTitles: this.showSectionTitles,
				showLinkDescriptions: this.showLinkDescriptions,
			}
		},
	},

	methods: {
		/**
		 * Deep-clone the sections into a normalised shape.
		 *
		 * @param {object[]} sections the sections to clone.
		 * @return {Array<{title: string, links: object[]}>} the cloned sections.
		 */
		cloneSections(sections) {
			return sections.map((section) => ({
				title: typeof section?.title === 'string' ? section.title : '',
				links: Array.isArray(section?.links)
					? section.links.map((link) => ({
						label: typeof link?.label === 'string' ? link.label : '',
						url: typeof link?.url === 'string' ? link.url : '',
						icon: typeof link?.icon === 'string' ? link.icon : '',
						description: typeof link?.description === 'string' ? link.description : '',
					}))
					: [],
			}))
		},

		/**
		 * Clamp the column count to 1–6.
		 *
		 * @param {*} value the candidate column count.
		 * @return {number} the clamped column count.
		 */
		clampColumns(value) {
			const num = Number(value)
			if (!Number.isFinite(num)) {
				return DEFAULT_CONTENT.columns
			}
			return Math.max(1, Math.min(6, Math.round(num)))
		},

		/**
		 * Emit `update:content` with the current assembled payload.
		 *
		 * @return {void}
		 */
		emitUpdate() {
			this.$emit('update:content', this.assembledContent)
		},

		/**
		 * Append a new section, then emit.
		 *
		 * @return {void}
		 */
		addSection() {
			this.sections.push(makeEmptySection())
			this.emitUpdate()
		},

		/**
		 * Delete a section, then emit.
		 *
		 * @param {number} index the section index.
		 * @return {void}
		 */
		deleteSection(index) {
			this.sections.splice(index, 1)
			this.emitUpdate()
		},

		/**
		 * Move a section up or down, then emit.
		 *
		 * @param {number} index the section index.
		 * @param {number} delta `-1` or `+1`.
		 * @return {void}
		 */
		moveSection(index, delta) {
			const target = index + delta
			if (target < 0 || target >= this.sections.length) {
				return
			}
			const [removed] = this.sections.splice(index, 1)
			this.sections.splice(target, 0, removed)
			this.emitUpdate()
		},

		/**
		 * Update a section title, then emit.
		 *
		 * @param {number} index the section index.
		 * @param {string} title the new title.
		 * @return {void}
		 */
		updateSectionTitle(index, title) {
			if (this.sections[index]) {
				this.$set(this.sections[index], 'title', title)
				this.emitUpdate()
			}
		},

		/**
		 * Append a link to a section, then emit.
		 *
		 * @param {number} sectionIndex the section index.
		 * @return {void}
		 */
		addLink(sectionIndex) {
			const section = this.sections[sectionIndex]
			if (section) {
				section.links.push(makeEmptyLink())
				this.emitUpdate()
			}
		},

		/**
		 * Delete a link from a section, then emit.
		 *
		 * @param {number} sectionIndex the section index.
		 * @param {number} linkIndex the link index.
		 * @return {void}
		 */
		deleteLink(sectionIndex, linkIndex) {
			const section = this.sections[sectionIndex]
			if (section && section.links[linkIndex] !== undefined) {
				section.links.splice(linkIndex, 1)
				this.emitUpdate()
			}
		},

		/**
		 * Move a link up or down within its section, then emit.
		 *
		 * @param {number} sectionIndex the section index.
		 * @param {number} linkIndex the link index.
		 * @param {number} delta `-1` or `+1`.
		 * @return {void}
		 */
		moveLink(sectionIndex, linkIndex, delta) {
			const section = this.sections[sectionIndex]
			if (!section) {
				return
			}
			const target = linkIndex + delta
			if (target < 0 || target >= section.links.length) {
				return
			}
			const [removed] = section.links.splice(linkIndex, 1)
			section.links.splice(target, 0, removed)
			this.emitUpdate()
		},

		/**
		 * Update one field of one link, then emit.
		 *
		 * @param {number} sectionIndex the section index.
		 * @param {number} linkIndex the link index.
		 * @param {string} field the link field.
		 * @param {string} value the new value.
		 * @return {void}
		 */
		updateLink(sectionIndex, linkIndex, field, value) {
			const section = this.sections[sectionIndex]
			if (!section) {
				return
			}
			const link = section.links[linkIndex]
			if (!link) {
				return
			}
			this.$set(link, field, value)
			this.emitUpdate()
		},

		/**
		 * Update a global layout option, then emit.
		 *
		 * @param {string} field the option field.
		 * @param {*} value the new value.
		 * @return {void}
		 */
		updateOption(field, value) {
			if (field === 'linkLayout' && !VALID_LAYOUTS.includes(value)) {
				return
			}
			if (field === 'iconSize' && !VALID_SIZES.includes(value)) {
				return
			}
			this[field] = value
			this.emitUpdate()
		},

		/**
		 * Validate every link URL across every section. Empty sections are
		 * skipped (the renderer hides them anyway).
		 *
		 * @return {string[]} the validation errors (empty when valid).
		 */
		validate() {
			const errors = []
			const linkErrors = []
			this.sections.forEach((section, sIdx) => {
				const sectionErrors = []
				if (!Array.isArray(section.links)) {
					linkErrors[sIdx] = sectionErrors
					return
				}
				section.links.forEach((link, lIdx) => {
					if (typeof link.label !== 'string' || link.label.trim() === '') {
						const msg = t('nextcloud-vue', 'Link label is required')
						sectionErrors[lIdx] = msg
						errors.push(msg)
					}
					const urlError = validateUrl(link.url)
					if (urlError) {
						sectionErrors[lIdx] = urlError
						errors.push(urlError)
					}
				})
				linkErrors[sIdx] = sectionErrors
			})
			this.linkErrors = linkErrors
			this.firstError = errors.length > 0 ? errors[0] : ''
			return errors
		},
	},
}
</script>

<style scoped>
.cn-links-form {
	display: flex;
	flex-direction: column;
	gap: 16px;
}

.cn-links-form__sections {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.cn-links-form__section {
	display: flex;
	flex-direction: column;
	gap: 8px;
	padding: 12px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius, 4px);
	background-color: var(--color-background-hover);
}

.cn-links-form__section-header {
	display: flex;
	gap: 8px;
	align-items: center;
}

.cn-links-form__section-title {
	flex: 1;
	font-weight: 600;
	font-size: 14px;
	padding: 6px 10px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	background-color: var(--color-main-background);
	color: var(--color-main-text);
}

.cn-links-form__section-actions {
	display: flex;
	gap: 4px;
}

.cn-links-form__links {
	display: flex;
	flex-direction: column;
	gap: 6px;
	padding-left: 8px;
}

.cn-links-form__link-row {
	display: flex;
	gap: 6px;
	align-items: center;
	flex-wrap: wrap;
}

.cn-links-form__input {
	flex: 1;
	min-width: 80px;
	padding: 6px 10px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	background-color: var(--color-main-background);
	color: var(--color-main-text);
	font-size: 13px;
}

.cn-links-form__link-row--invalid .cn-links-form__input {
	border-color: var(--color-error);
}

.cn-links-form__input--narrow {
	flex: 0 0 auto;
	width: 110px;
}

.cn-links-form__btn {
	padding: 4px 10px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	background-color: var(--color-main-background);
	color: var(--color-main-text);
	cursor: pointer;
	font-size: 13px;
}

.cn-links-form__btn--small {
	padding: 2px 6px;
	font-size: 12px;
}

.cn-links-form__btn--ghost {
	border-style: dashed;
	background-color: transparent;
	align-self: flex-start;
}

.cn-links-form__btn--danger {
	border-color: var(--color-error);
	color: var(--color-error);
}

.cn-links-form__btn:disabled {
	opacity: 0.4;
	cursor: not-allowed;
}

.cn-links-form__options {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
	gap: 12px;
	padding-top: 12px;
	border-top: 1px solid var(--color-border);
}

.cn-links-form__option {
	display: flex;
	flex-direction: column;
	gap: 4px;
	font-size: 13px;
}

.cn-links-form__option--checkbox {
	flex-direction: row;
	align-items: center;
	gap: 6px;
}

.cn-links-form__error {
	margin: 0;
	color: var(--color-error);
	font-size: 13px;
}
</style>
