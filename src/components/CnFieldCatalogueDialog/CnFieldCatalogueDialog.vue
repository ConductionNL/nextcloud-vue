<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<CnDialog
		:name="dialogTitle"
		:subtitle="description"
		width="wizard"
		:notices="notices"
		data-testid="cn-field-catalogue-dialog"
		@closing="$emit('closing')">
		<div class="cn-field-catalogue">
			<nav class="cn-field-catalogue__folders" :aria-label="foldersLabel">
				<CnFolderTree :folders="folderTree" :selectedId="activeFolder" @select="activeFolder = $event" />
			</nav>
			<div class="cn-field-catalogue__fields">
				<p v-if="loading" class="cn-field-catalogue__state">
					{{ loadingLabel }}
				</p>
				<p v-else-if="groups.length === 0" class="cn-field-catalogue__state" data-testid="cn-field-catalogue-empty">
					{{ emptyLabel }}
				</p>
				<template v-else>
					<section v-for="group in groups"
						:key="group.id"
						class="cn-field-catalogue__group"
						:aria-label="group.name">
						<h3 class="cn-field-catalogue__heading">
							{{ group.name }}
						</h3>
						<ul class="cn-field-catalogue__list">
							<li v-for="field in group.fields" :key="field.id" class="cn-field-catalogue__row">
								<label class="cn-field-catalogue__option" data-testid="cn-field-catalogue-option">
									<input :type="multiple ? 'checkbox' : 'radio'"
										name="cn-field-catalogue"
										:value="field.id"
										:checked="chosen.includes(field.id)"
										@change="toggle(field.id, $event.target.checked)">
									<span class="cn-field-catalogue__text">
										<strong>{{ field.label }}</strong>
										<span class="cn-field-catalogue__meta">{{ field.meta }}</span>
									</span>
								</label>
							</li>
						</ul>
					</section>
				</template>
			</div>
		</div>
		<template #actions>
			<NcButton variant="tertiary" data-testid="cn-field-catalogue-cancel" @click="$emit('closing')">
				{{ cancelLabel }}
			</NcButton>
			<NcButton variant="primary"
				:disabled="chosen.length === 0"
				data-testid="cn-field-catalogue-confirm"
				@click="confirm">
				{{ confirmText }}
			</NcButton>
		</template>
	</CnDialog>
</template>

<script>
import { translatePlural as n, translate as t } from '@nextcloud/l10n'
import { NcButton } from '@nextcloud/vue'
import { CnDialog } from '../CnDialog/index.js'
import { CnFolderTree } from '../CnFolderTree/index.js'

/** The folder id that lists every attribute. */
const ALL = '__all__'

/**
 * CnFieldCatalogueDialog: pick attributes from a catalogue kept in folders
 * (DqZaaktypeVelden "Attribuut kiezen uit de catalogus"). The folders on the
 * left with their counts, "All attributes" first; the attributes on the
 * right under their folder's name, each with its type and, when more than
 * one place uses it, how many. Cancel and Add in the footer; a read refusal
 * (`error`) is the dialog's alert notice.
 *
 * Generic: any catalogue of named fields in folders (case type attributes,
 * form fields, shared properties). The app reads the catalogue and saves the
 * choice; the dialog only lets a person pick.
 *
 * @event select The chosen fields (an array, one entry without `multiple`).
 * @event closing The dialog asks to close.
 */
export default {
	name: 'CnFieldCatalogueDialog',

	components: { CnDialog, CnFolderTree, NcButton },

	inject: {
		cnTranslate: { default: () => (key) => key },
	},

	props: {
		/** The title, translated by the host. Default "Choose an attribute from the catalogue". */
		title: { type: String, default: '' },
		/** A line under the title. */
		description: { type: String, default: '' },
		/**
		 * The attributes: `{ id, name, label?, type?, typeLabel?, folderId?, usageCount? }`.
		 * `label` (else `name`) is shown; `typeLabel` (else `type`) is the meta line.
		 *
		 * @type {Array<object>}
		 */
		fields: { type: Array, default: () => [] },
		/**
		 * The folders: `{ id, name }` in order. A field whose `folderId` names
		 * none of them goes under `otherLabel`.
		 *
		 * @type {Array<{id: (string|number), name: string}>}
		 */
		folders: { type: Array, default: () => [] },
		/** Ids that cannot be picked again (already on the record); they are left out. */
		excludeIds: { type: Array, default: () => [] },
		/** Pick more than one. */
		multiple: { type: Boolean, default: true },
		/** The catalogue is being read. */
		loading: { type: Boolean, default: false },
		/** A read refusal or failure, in the server's words; drawn as the dialog's alert. */
		error: { type: String, default: '' },
		/** "All attributes". */
		allLabel: { type: String, default: '' },
		/** The heading for fields in no known folder. Default "Uncategorised". */
		otherLabel: { type: String, default: '' },
		/** The usage text, `{count}` filled in; shown for a count above one. Default "in {count} places". */
		usageLabel: { type: String, default: '' },
		/** The confirm button. Default "Add". */
		confirmLabel: { type: String, default: '' },
	},

	emits: ['select', 'closing'],

	data() {
		return {
			activeFolder: ALL,
			chosen: [],
		}
	},

	computed: {
		/**
		 * @spec openspec/changes/field-catalogue-dialog/specs/field-catalogue-dialog/spec.md#requirement-a-dialog-picks-attributes-from-a-catalogue-in-folders
		 */
		dialogTitle() {
			return this.tr(this.title) || t('nextcloud-vue', 'Choose an attribute from the catalogue')
		},

		/**
		 * @spec openspec/changes/field-catalogue-dialog/specs/field-catalogue-dialog/spec.md#requirement-a-dialog-picks-attributes-from-a-catalogue-in-folders
		 */
		foldersLabel() {
			return t('nextcloud-vue', 'Folders')
		},

		/**
		 * @spec openspec/changes/field-catalogue-dialog/specs/field-catalogue-dialog/spec.md#requirement-a-dialog-picks-attributes-from-a-catalogue-in-folders
		 */
		loadingLabel() {
			return t('nextcloud-vue', 'Loading …')
		},

		/**
		 * @spec openspec/changes/field-catalogue-dialog/specs/field-catalogue-dialog/spec.md#requirement-a-dialog-picks-attributes-from-a-catalogue-in-folders
		 */
		emptyLabel() {
			return t('nextcloud-vue', 'No attributes in this folder.')
		},

		/**
		 * @spec openspec/changes/field-catalogue-dialog/specs/field-catalogue-dialog/spec.md#requirement-a-dialog-picks-attributes-from-a-catalogue-in-folders
		 */
		cancelLabel() {
			return t('nextcloud-vue', 'Cancel')
		},

		/**
		 * @spec openspec/changes/field-catalogue-dialog/specs/field-catalogue-dialog/spec.md#requirement-a-dialog-picks-attributes-from-a-catalogue-in-folders
		 */
		confirmText() {
			return this.tr(this.confirmLabel) || t('nextcloud-vue', 'Add')
		},

		/**
		 * @return {Array<object>} The alert for a read refusal.
		 *
		 * @spec openspec/changes/field-catalogue-dialog/specs/field-catalogue-dialog/spec.md#requirement-a-dialog-picks-attributes-from-a-catalogue-in-folders
		 */
		notices() {
			return this.error ? [{ variant: 'error', role: 'alert', text: this.error }] : []
		},

		/**
		 * @return {Array<object>} The pickable fields as drawn.
		 *
		 * @spec openspec/changes/field-catalogue-dialog/specs/field-catalogue-dialog/spec.md#requirement-a-dialog-picks-attributes-from-a-catalogue-in-folders
		 */
		options() {
			const excluded = new Set(this.excludeIds.map(String))
			const known = new Set(this.folders.map((folder) => String(folder.id)))
			return this.fields
				.filter((field) => field && field.id !== undefined && !excluded.has(String(field.id)))
				.map((field) => {
					const usage = Number(field.usageCount)
					const type = this.tr(field.typeLabel || field.type || '')
					const usageText = usage > 1
						? (this.usageLabel ? this.tr(this.usageLabel).replace('{count}', String(usage)) : n('nextcloud-vue', 'in {count} place', 'in {count} places', usage, { count: usage }))
						: ''
					return {
						id: String(field.id),
						raw: field,
						label: this.tr(field.label || field.name || String(field.id)),
						meta: [type, usageText].filter(Boolean).join(' · '),
						folder: known.has(String(field.folderId)) ? String(field.folderId) : '',
					}
				})
		},

		/**
		 * The folder list: All first, the folders, then the uncategorised ones.
		 *
		 * @return {Array<{id: string, name: string, count: number}>} The folders with their counts.
		 * @spec openspec/changes/field-catalogue-dialog/specs/field-catalogue-dialog/spec.md#requirement-a-dialog-picks-attributes-from-a-catalogue-in-folders
		 */
		folderTree() {
			const count = (id) => this.options.filter((option) => option.folder === id).length
			const tree = [{ id: ALL, name: this.tr(this.allLabel) || t('nextcloud-vue', 'All attributes'), count: this.options.length, icon: 'FormatListBulleted' }]
			for (const folder of this.folders) {
				tree.push({ id: String(folder.id), name: this.tr(folder.name), count: count(String(folder.id)) })
			}
			if (count('') > 0) {
				tree.push({ id: '', name: this.tr(this.otherLabel) || t('nextcloud-vue', 'Uncategorised'), count: count('') })
			}
			return tree
		},

		/**
		 * @return {Array<{id: string, name: string, fields: Array<object>}>} The fields shown, by folder.
		 *
		 * @spec openspec/changes/field-catalogue-dialog/specs/field-catalogue-dialog/spec.md#requirement-a-dialog-picks-attributes-from-a-catalogue-in-folders
		 */
		groups() {
			const shown = this.folderTree.filter((folder) => folder.id !== ALL && (this.activeFolder === ALL || folder.id === this.activeFolder))
			return shown
				.map((folder) => ({ id: folder.id || 'other', name: folder.name, fields: this.options.filter((option) => option.folder === folder.id) }))
				.filter((group) => group.fields.length > 0)
		},
	},

	methods: {
		/**
		 * @param {unknown} key A text.
		 * @return {string} Its translation.
		 * @spec openspec/changes/field-catalogue-dialog/specs/field-catalogue-dialog/spec.md#requirement-a-dialog-picks-attributes-from-a-catalogue-in-folders
		 */
		tr(key) {
			return typeof key === 'string' && key !== '' ? this.cnTranslate(key) : ''
		},

		/**
		 * @param {string} id The field id.
		 * @param {boolean} on Whether it is now chosen.
		 * @spec openspec/changes/field-catalogue-dialog/specs/field-catalogue-dialog/spec.md#requirement-a-dialog-picks-attributes-from-a-catalogue-in-folders
		 */
		toggle(id, on) {
			if (!this.multiple) {
				this.chosen = on ? [id] : []
				return
			}
			this.chosen = on ? [...new Set([...this.chosen, id])] : this.chosen.filter((entry) => entry !== id)
		},

		/**
		 * Emit the chosen fields.
		 *
		 * @spec openspec/changes/field-catalogue-dialog/specs/field-catalogue-dialog/spec.md#requirement-a-dialog-picks-attributes-from-a-catalogue-in-folders
		 */
		confirm() {
			const picked = this.options.filter((option) => this.chosen.includes(option.id)).map((option) => option.raw)
			this.$emit('select', picked)
		},
	},
}
</script>

<style scoped>
.cn-field-catalogue {
	display: grid;
	grid-template-columns: minmax(180px, 220px) minmax(0, 1fr);
	gap: 16px;
	min-height: 320px;
}

.cn-field-catalogue__folders {
	padding-inline-end: 12px;
	border-inline-end: 1px solid var(--color-border);
}

.cn-field-catalogue__heading {
	margin: 12px 0 4px;
	color: var(--color-text-maxcontrast);
	font-size: 13px;
	font-weight: 600;
}

.cn-field-catalogue__group:first-child .cn-field-catalogue__heading {
	margin-top: 0;
}

.cn-field-catalogue__list {
	margin: 0;
	padding: 0;
	list-style: none;
}

.cn-field-catalogue__row {
	padding: 8px 0;
	border-top: 1px solid var(--color-border);
	font-size: 14px;
}

.cn-field-catalogue__option {
	display: flex;
	align-items: flex-start;
	gap: 10px;
	cursor: pointer;
}

.cn-field-catalogue__text {
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.cn-field-catalogue__meta,
.cn-field-catalogue__state {
	color: var(--color-text-maxcontrast);
	font-size: 13px;
}

@media (max-width: 640px) {
	.cn-field-catalogue {
		grid-template-columns: minmax(0, 1fr);
	}

	.cn-field-catalogue__folders {
		padding-inline-end: 0;
		border-inline-end: 0;
	}
}
</style>
