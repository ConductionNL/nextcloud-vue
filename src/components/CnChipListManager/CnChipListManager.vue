<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<CnSettingsSection
		:name="title"
		:description="description"
		class="cn-chip-list"
		data-testid="cn-chip-list">
		<NcLoadingIcon v-if="loading" :size="24" :name="t('nextcloud-vue', 'Loading …')" />
		<ul v-else class="cn-chip-list__chips" :aria-label="title">
			<li v-for="item in sorted"
				:key="item.id"
				class="cn-chip-list__chip"
				:data-testid="`cn-chip-list-chip-${item.name}`">
				<input v-if="renaming === item.id"
					ref="renameInput"
					v-model="renameDraft"
					class="cn-chip-list__rename"
					type="text"
					:aria-label="t('nextcloud-vue', 'New name for {name}', { name: item.name })"
					data-testid="cn-chip-list-rename-input"
					@keydown="onRenameKey($event, item)"
					@blur="saveRename(item)">
				<span v-else
					class="cn-chip-list__name"
					:tabindex="readOnly ? null : 0"
					:title="readOnly ? null : t('nextcloud-vue', 'Double-click to rename')"
					data-testid="cn-chip-list-name"
					@dblclick="startRename(item)"
					@keydown.f2.prevent="startRename(item)">{{ item.name }}</span>
				<button v-if="!readOnly"
					type="button"
					class="cn-chip-list__remove"
					:disabled="busy"
					:aria-label="t('nextcloud-vue', 'Delete {name}', { name: item.name })"
					:title="t('nextcloud-vue', 'Delete {name}', { name: item.name })"
					:data-testid="`cn-chip-list-remove-${item.name}`"
					@click="confirming = item">
					<Close :size="14" />
				</button>
			</li>
		</ul>

		<form v-if="!readOnly" class="cn-chip-list__add" @submit.prevent="add">
			<div class="cn-chip-list__field">
				<label :for="inputId" class="cn-chip-list__label">{{ resolvedAddLabel }}</label>
				<input :id="inputId"
					v-model="draft"
					class="cn-chip-list__input"
					type="text"
					:placeholder="resolvedPlaceholder"
					:aria-invalid="error ? 'true' : null"
					data-testid="cn-chip-list-input">
			</div>
			<div class="cn-chip-list__actions">
				<NcButton type="submit"
					variant="secondary"
					:disabled="busy"
					data-testid="cn-chip-list-submit">
					<template #icon>
						<Plus :size="16" />
					</template>
					{{ resolvedSubmitLabel }}
				</NcButton>
			</div>
		</form>

		<p v-if="error"
			class="cn-chip-list__error"
			role="alert"
			data-testid="cn-chip-list-error">
			{{ error }}
		</p>
		<p v-if="note && !readOnly" class="cn-chip-list__note" data-testid="cn-chip-list-note">
			{{ note }}
		</p>

		<CnConfirmDialog v-if="confirming"
			:dialogTitle="t('nextcloud-vue', 'Delete {name}', { name: confirming.name })"
			:message="resolvedDeleteMessage(confirming.name)"
			:confirmLabel="t('nextcloud-vue', 'Delete')"
			variant="error"
			@confirm="remove(confirming)"
			@close="confirming = null" />
	</CnSettingsSection>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcLoadingIcon } from '@nextcloud/vue'
import Close from 'vue-material-design-icons/Close.vue'
import Plus from 'vue-material-design-icons/Plus.vue'
import CnConfirmDialog from '../../dialogs/CnConfirmDialog.vue'
import CnSettingsSection from '../CnSettingsSection/CnSettingsSection.vue'
import { cnFetchJson } from '../../utils/cnFetch.js'

let uid = 0

/**
 * CnChipListManager: an admin card that keeps a list of words, one
 * OpenRegister object each, as chips. It lists them, adds one, renames one on
 * double-click (or F2) and deletes one after a confirm.
 *
 * A rename goes to `renameUrl` when given (`{id}` is the object's id), so an
 * app can rewrite the word where it is used; otherwise it updates the object.
 * The server decides who may write: a refusal shows as a line in the card.
 *
 * ```vue
 * <CnChipListManager
 *   register="pipelinq"
 *   schema="label"
 *   :title="t('pipelinq', 'Labels')"
 *   :description="t('pipelinq', 'The labels people can pick for articles, leads and clients.')"
 *   renameUrl="/apps/pipelinq/api/labels/{id}/rename"
 *   :note="t('pipelinq', 'Double-click a label to rename it. A deleted label stays on the items that already use it.')" />
 * ```
 *
 * @spec openspec/changes/chip-list-manager/specs/chip-list-manager/spec.md#requirement-an-administrator-keeps-a-word-list-as-chips
 */
export default {
	name: 'CnChipListManager',

	components: { Close, CnConfirmDialog, CnSettingsSection, NcButton, NcLoadingIcon, Plus },

	props: {
		/** The OpenRegister register slug or id. */
		register: { type: String, required: true },
		/** The OpenRegister schema slug or id; one object per word. */
		schema: { type: String, required: true },
		/** The property that holds the word. */
		field: { type: String, default: 'name' },
		/** The card's title. */
		title: { type: String, default: '' },
		/** The line under the title. */
		description: { type: String, default: '' },
		/** A line under the form, such as how renaming works. */
		note: { type: String, default: '' },
		/** POST endpoint for a rename, `{id}` filled; body `{ name }`. */
		renameUrl: { type: String, default: '' },
		/** The label above the new-word field; default "New item". */
		addLabel: { type: String, default: '' },
		/** The placeholder of the new-word field; default "Enter a name". */
		placeholder: { type: String, default: '' },
		/** The add button's text; default "Add". */
		submitLabel: { type: String, default: '' },
		/** The confirm sentence, `{name}` filled; default says items keep the word. */
		deleteMessage: { type: String, default: '' },
		/** Only list the words. */
		readOnly: { type: Boolean, default: false },
		/** The OpenRegister API base. */
		apiBase: { type: String, default: '/apps/openregister/api' },
	},

	emits: ['changed'],

	data() {
		uid += 1
		return {
			inputId: `cn-chip-list-input-${uid}`,
			items: [],
			loading: true,
			busy: false,
			draft: '',
			error: '',
			renaming: null,
			renameDraft: '',
			confirming: null,
		}
	},

	computed: {
		/** The words in alphabetical order, case-insensitive. */
		sorted() {
			return [...this.items].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
		},

		listUrl() {
			return `${this.apiBase}/objects/${encodeURIComponent(this.register)}/${encodeURIComponent(this.schema)}`
		},

		resolvedAddLabel() {
			return this.addLabel || t('nextcloud-vue', 'New item')
		},

		resolvedPlaceholder() {
			return this.placeholder || t('nextcloud-vue', 'Enter a name')
		},

		resolvedSubmitLabel() {
			return this.submitLabel || t('nextcloud-vue', 'Add')
		},
	},

	created() {
		this.load()
	},

	methods: {
		t,

		/**
		 * Read the words.
		 *
		 * @spec openspec/changes/chip-list-manager/specs/chip-list-manager/spec.md#requirement-an-administrator-keeps-a-word-list-as-chips
		 */
		async load() {
			this.loading = true
			try {
				const data = await cnFetchJson(this.listUrl, { query: { _limit: 500 } })
				const rows = Array.isArray(data?.results) ? data.results : []
				this.items = rows
					.map((row) => ({ id: row.id ?? row['@self']?.id ?? row.uuid, name: String(row[this.field] ?? ''), row }))
					.filter((item) => item.id && item.name !== '')
			} catch {
				this.items = []
				this.error = t('nextcloud-vue', 'The list could not be loaded.')
			} finally {
				this.loading = false
			}
		},

		/**
		 * Whether another word already has this name, whatever the case.
		 *
		 * @param {string} name The name.
		 * @param {string|null} exceptId The word being renamed.
		 * @return {boolean}
		 */
		taken(name, exceptId = null) {
			const wanted = name.toLocaleLowerCase()
			return this.items.some((item) => item.id !== exceptId && item.name.toLocaleLowerCase() === wanted)
		},

		/**
		 * The line for a refused or failed write.
		 *
		 * @param {Error} err The failure.
		 * @return {string}
		 */
		failure(err) {
			if (err?.status === 403) {
				return t('nextcloud-vue', 'You are not allowed to change this list.')
			}
			if (err?.status === 409) {
				return t('nextcloud-vue', 'This name is already on the list.')
			}
			return t('nextcloud-vue', 'The list could not be changed. Try again.')
		},

		/**
		 * The confirm sentence for deleting a word.
		 *
		 * @param {string} name The word.
		 * @return {string}
		 */
		resolvedDeleteMessage(name) {
			if (this.deleteMessage) {
				return this.deleteMessage.replace('{name}', name)
			}
			return t('nextcloud-vue', 'Delete {name} from the list? Items that already use it keep it.', { name })
		},

		/**
		 * Add the typed word.
		 *
		 * @spec openspec/changes/chip-list-manager/specs/chip-list-manager/spec.md#requirement-an-administrator-keeps-a-word-list-as-chips
		 */
		async add() {
			const name = this.draft.trim()
			this.error = ''
			if (name === '') {
				return
			}
			if (this.taken(name)) {
				this.error = t('nextcloud-vue', 'This name is already on the list.')
				return
			}
			this.busy = true
			try {
				const saved = await cnFetchJson(this.listUrl, { method: 'POST', body: JSON.stringify({ [this.field]: name }) })
				const id = saved?.id ?? saved?.['@self']?.id ?? saved?.uuid ?? name
				this.items.push({ id, name, row: saved || { [this.field]: name } })
				this.draft = ''
				this.$emit('changed')
			} catch (err) {
				this.error = this.failure(err)
			} finally {
				this.busy = false
			}
		},

		/**
		 * Turn a chip into a field holding its name.
		 *
		 * @param {object} item The word.
		 */
		startRename(item) {
			if (this.readOnly || this.busy) {
				return
			}
			this.error = ''
			this.renaming = item.id
			this.renameDraft = item.name
			this.$nextTick(() => {
				const input = Array.isArray(this.$refs.renameInput) ? this.$refs.renameInput[0] : this.$refs.renameInput
				input?.focus()
				input?.select()
			})
		},

		/**
		 * Enter saves the rename, Escape drops it.
		 *
		 * @param {KeyboardEvent} event The key.
		 * @param {object} item The word.
		 */
		onRenameKey(event, item) {
			if (event.key === 'Enter') {
				event.preventDefault()
				this.saveRename(item)
			} else if (event.key === 'Escape') {
				event.preventDefault()
				this.renaming = null
			}
		},

		/**
		 * Save the rename, through `renameUrl` when given.
		 *
		 * @param {object} item The word.
		 * @spec openspec/changes/chip-list-manager/specs/chip-list-manager/spec.md#requirement-an-administrator-keeps-a-word-list-as-chips
		 */
		async saveRename(item) {
			if (this.renaming !== item.id) {
				return
			}
			const name = this.renameDraft.trim()
			this.renaming = null
			if (name === '' || name === item.name) {
				return
			}
			if (this.taken(name, item.id)) {
				this.error = t('nextcloud-vue', 'This name is already on the list.')
				return
			}
			this.busy = true
			try {
				if (this.renameUrl) {
					await cnFetchJson(this.renameUrl.replace('{id}', encodeURIComponent(item.id)), { method: 'POST', body: JSON.stringify({ name }) })
				} else {
					const row = { ...(item.row || {}), [this.field]: name }
					delete row['@self']
					await cnFetchJson(`${this.listUrl}/${encodeURIComponent(item.id)}`, { method: 'PUT', body: JSON.stringify(row) })
				}
				item.name = name
				item.row = { ...item.row, [this.field]: name }
				this.$emit('changed')
			} catch (err) {
				this.error = this.failure(err)
			} finally {
				this.busy = false
			}
		},

		/**
		 * Delete a word after the confirm.
		 *
		 * @param {object} item The word.
		 * @spec openspec/changes/chip-list-manager/specs/chip-list-manager/spec.md#requirement-an-administrator-keeps-a-word-list-as-chips
		 */
		async remove(item) {
			this.confirming = null
			this.error = ''
			this.busy = true
			try {
				await cnFetchJson(`${this.listUrl}/${encodeURIComponent(item.id)}`, { method: 'DELETE' })
				this.items = this.items.filter((other) => other.id !== item.id)
				this.$emit('changed')
			} catch (err) {
				this.error = this.failure(err)
			} finally {
				this.busy = false
			}
		},
	},
}
</script>

<style scoped>
.cn-chip-list__chips {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
	margin: 0 0 14px;
	padding: 0;
	list-style: none;
}

.cn-chip-list__chip {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	height: 30px;
	padding: 0 4px 0 12px;
	border-radius: 15px;
	background: var(--color-background-dark);
	color: var(--color-main-text);
	font-size: 14px;
	font-weight: 600;
}

.cn-chip-list__name {
	cursor: text;
	border-radius: 4px;
}

.cn-chip-list__name:focus-visible {
	outline: 2px solid var(--color-primary-element);
	outline-offset: 2px;
}

.cn-chip-list__rename {
	height: 24px;
	min-height: 24px;
	width: 14ch;
	margin: 0;
	padding: 0 6px;
	font: inherit;
}

.cn-chip-list__remove {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	flex: none;
	width: 36px;
	height: 36px;
	min-height: 36px;
	margin: 0;
	padding: 0;
	border: 0;
	border-radius: 18px;
	background: transparent;
	color: inherit;
	cursor: pointer;
}

.cn-chip-list__remove:hover,
.cn-chip-list__remove:focus-visible {
	background: var(--color-background-hover);
}

.cn-chip-list__add {
	display: flex;
	flex-direction: column;
	gap: 14px;
}

.cn-chip-list__field {
	display: flex;
	flex-direction: column;
	gap: 6px;
	max-width: 420px;
}

.cn-chip-list__label {
	font-size: 14px;
	font-weight: 600;
}

.cn-chip-list__input {
	width: 100%;
	height: 40px;
	margin: 0;
	padding: 0 12px;
	box-sizing: border-box;
	border: 1px solid var(--color-border-maxcontrast);
	border-radius: var(--border-radius-element, 8px);
	font: inherit;
}

.cn-chip-list__actions {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
}

.cn-chip-list__error {
	margin: 10px 0 0;
	color: var(--color-error-text, var(--color-error));
}

.cn-chip-list__note {
	margin: 14px 0 0;
	font-size: 13px;
	color: var(--color-text-maxcontrast);
}
</style>
