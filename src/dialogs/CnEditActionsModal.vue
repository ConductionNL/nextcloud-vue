<!--
  CnEditActionsModal — edit the active page's action buttons (ADR-041 / ADR-004).

  Mutates the working manifest copy ONLY: add, remove, reorder, relabel, re-icon
  and re-target the active page's declarative actions. Two surfaces, because the
  manifest has two arrays: `config.headerActions[]` is the page's Actions menu,
  read by the dashboard, index and detail pages alike, while `config.actions[]`
  is CnIndexPage's per-ROW menu and is read by nothing else.
  Isolated NcDialog file per ADR-004. Every NcSelect carries an `inputLabel`.
-->
<template>
	<NcDialog size="normal" :name="t('nextcloud-vue', 'Edit actions')" @closing="$emit('close')">
		<NcEmptyContent
			v-if="!page"
			:name="t('nextcloud-vue', 'No editable page')" />
		<template v-else>
			<NcSelect v-if="surfaceOptions.length > 1"
				class="cn-edit-actions__surface"
				:model-value="selectedSurface"
				:options="surfaceOptions"
				:clearable="false"
				label="label"
				:input-label="t('nextcloud-vue', 'Where these actions appear')"
				@update:model-value="setSurface" />
			<p class="cn-edit-actions__hint">
				{{ surfaceHint }}
			</p>

			<NcNoteCard v-if="strandedActions.length" type="warning">
				{{ n('nextcloud-vue',
					'%n action is stored under config.actions, which this page type does not render.',
					'%n actions are stored under config.actions, which this page type does not render.',
					strandedActions.length) }}
				<NcButton variant="secondary" @click="adoptStranded">
					{{ t('nextcloud-vue', 'Move to the Actions menu') }}
				</NcButton>
			</NcNoteCard>

			<p v-if="!actions.length" class="cn-edit-actions__hint">
				{{ t('nextcloud-vue', 'Nothing here yet. Use “Add action” below to create one.') }}
			</p>
			<ul class="cn-edit-actions__list">
				<li v-for="(action, index) in actions" :key="action.id || index" class="cn-edit-actions__row">
					<div class="cn-edit-actions__fields">
						<NcTextField
							v-model="action.label"
							:label="t('nextcloud-vue', 'Label')"
							:label-visible="true" />
						<CnIconBrowser
							:value="action.icon || null"
							:label="t('nextcloud-vue', 'Icon')"
							clearable
							@input="(value) => setIcon(action, value)" />
						<NcSelect
							v-model="action.type"
							:options="actionTypes"
							:input-label="t('nextcloud-vue', 'Type')"
							:clearable="false" />
						<NcTextField
							v-model="action.target"
							:label="targetLabel(action)"
							:label-visible="true" />
					</div>
					<div class="cn-edit-actions__row-actions">
						<NcButton variant="tertiary"
							:aria-label="t('nextcloud-vue', 'Move up')"
							:disabled="index === 0"
							@click="move(index, -1)">
							<template #icon>
								<ArrowUp :size="20" />
							</template>
						</NcButton>
						<NcButton variant="tertiary"
							:aria-label="t('nextcloud-vue', 'Move down')"
							:disabled="index === actions.length - 1"
							@click="move(index, 1)">
							<template #icon>
								<ArrowDown :size="20" />
							</template>
						</NcButton>
						<NcButton variant="tertiary" :aria-label="t('nextcloud-vue', 'Remove')" @click="remove(index)">
							<template #icon>
								<Delete :size="20" />
							</template>
						</NcButton>
					</div>
				</li>
			</ul>
		</template>

		<template #actions>
			<NcButton variant="secondary" @click="add">
				<template #icon>
					<Plus :size="20" />
				</template>
				{{ t('nextcloud-vue', 'Add action') }}
			</NcButton>
			<NcButton variant="primary" :disabled="saving" @click="onDone">
				<template #icon>
					<NcLoadingIcon v-if="saving" :size="20" />
					<ContentSaveOutline v-else :size="20" />
				</template>
				{{ saving ? t('nextcloud-vue', 'Saving…') : t('nextcloud-vue', 'Done') }}
			</NcButton>
		</template>
	</NcDialog>
</template>

<script>
import { NcDialog, NcButton, NcTextField, NcSelect, NcEmptyContent, NcLoadingIcon, NcNoteCard } from '@nextcloud/vue'
import { translate as t, translatePlural as n } from '@nextcloud/l10n'
import Plus from 'vue-material-design-icons/Plus.vue'
import Delete from 'vue-material-design-icons/Delete.vue'
import ArrowUp from 'vue-material-design-icons/ArrowUp.vue'
import ArrowDown from 'vue-material-design-icons/ArrowDown.vue'
import CnIconBrowser from '../components/CnIconBrowser/CnIconBrowser.vue'
import manifestModalDoneMixin from '../mixins/manifestModalDoneMixin.js'

const ACTION_TYPES = ['open-page', 'navigate', 'open-modal', 'handler']

export default {
	name: 'CnEditActionsModal',

	components: { NcDialog, NcButton, NcTextField, NcSelect, NcEmptyContent, NcLoadingIcon, NcNoteCard, CnIconBrowser, Plus, Delete, ArrowUp, ArrowDown },

	mixins: [manifestModalDoneMixin],

	props: {
		/**
		 * The working manifest copy whose active-page actions are edited.
		 *
		 * @type {object|null}
		 */
		working: {
			type: Object,
			default: null,
		},
		/**
		 * The active page's id; selects which page's actions to edit.
		 *
		 * @type {string}
		 */
		pageId: {
			type: String,
			default: '',
		},
	},

	emits: ['close'],

	data() {
		return {
			// Which action array is being edited: 'headerActions' | 'actions'.
			surface: 'headerActions',
		}
	},

	computed: {
		/** Closed enum of action types (open-page / navigate / open-modal / handler). */
		actionTypes() {
			return ACTION_TYPES
		},
		/** The active page object from the working manifest, or null. */
		page() {
			const pages = this.working && Array.isArray(this.working.pages) ? this.working.pages : []
			return pages.find((p) => p && p.id === this.pageId) ?? pages[0] ?? null
		},
		/** Whether the active page is an index page — the only type with rows. */
		isIndexPage() {
			return this.page?.type === 'index'
		},
		/**
		 * The surfaces this page type can actually render. `headerActions` is
		 * the page's Actions menu and is read by the dashboard, index and
		 * detail pages alike; `actions` is CnIndexPage's per-ROW menu and is
		 * read by nothing else.
		 */
		surfaceOptions() {
			const options = [{ id: 'headerActions', label: t('nextcloud-vue', 'Page actions menu') }]
			if (this.isIndexPage) options.push({ id: 'actions', label: t('nextcloud-vue', 'Row actions') })
			return options
		},
		/** The surface being edited, as a select option. */
		selectedSurface() {
			return this.surfaceOptions.find((o) => o.id === this.surface) || this.surfaceOptions[0]
		},
		/** What the surface being edited renders as, for the empty-state hint. */
		surfaceHint() {
			return this.surface === 'actions'
				? t('nextcloud-vue', 'Shown in the ⋯ menu on every row.')
				: t('nextcloud-vue', 'Shown in the Actions menu in the page header.')
		},
		/** The edited surface's array on the working page (ensured to exist). */
		actions() {
			if (!this.page) return []
			// Normalise the working page in place so the editor can bind to it —
			// the working manifest is ours to mutate by design (see CnEditPagesModal).
			// eslint-disable-next-line vue/no-side-effects-in-computed-properties
			if (!this.page.config || typeof this.page.config !== 'object') this.page.config = {}
			const key = this.selectedSurface.id
			// eslint-disable-next-line vue/no-side-effects-in-computed-properties
			if (!Array.isArray(this.page.config[key])) this.page.config[key] = []
			return this.page.config[key]
		},
		/**
		 * Actions stored under `config.actions` on a page type that renders no
		 * rows, so nothing reads them. They were written here by this modal
		 * before it knew the difference.
		 */
		strandedActions() {
			if (this.isIndexPage) return []
			const stored = this.page?.config?.actions
			return Array.isArray(stored) ? stored : []
		},
	},

	methods: {
		t,
		n,
		/**
		 * Human label for the target field, hinting what each type targets.
		 *
		 * @param {{type: string, target: string}} action The action row being edited;
		 *   only its `type` (one of `actionTypes`) selects the label.
		 * @return {string} The translated label for that action type's target input.
		 */
		targetLabel(action) {
			switch (action.type) {
			case 'open-page': return t('nextcloud-vue', 'Target page id')
			case 'navigate': return t('nextcloud-vue', 'URL or route')
			case 'open-modal': return t('nextcloud-vue', 'Modal key')
			default: return t('nextcloud-vue', 'Handler name')
			}
		},
		/**
		 * Switch the surface being edited.
		 *
		 * @param {{id: string}|null} option The selected surface option.
		 * @return {void}
		 */
		setSurface(option) {
			this.surface = option ? option.id : 'headerActions'
		},
		/**
		 * Move actions stranded under `config.actions` into the page's Actions
		 * menu, where this page type can render them.
		 *
		 * @return {void}
		 */
		adoptStranded() {
			const stranded = this.strandedActions
			if (!stranded.length) return
			this.surface = 'headerActions'
			this.actions.push(...stranded)
			delete this.page.config.actions
		},
		/**
		 * Set an action's icon from the icon browser, which emits `null` on clear
		 * while the manifest stores an absent icon as `''`.
		 *
		 * @param {object} action The action row being edited.
		 * @param {string|null} value The picked icon value.
		 * @return {void}
		 */
		setIcon(action, value) {
			action.icon = value || ''
		},
		/** Append a new blank action to the working page. */
		add() {
			this.actions.push({ id: `action-${this.actions.length + 1}`, label: '', icon: '', type: 'open-page', target: '' })
		},
		/**
		 * Remove the action at `index`.
		 *
		 * @param {number} index Zero-based index into the page's `config.actions`.
		 * @return {void}
		 */
		remove(index) {
			this.actions.splice(index, 1)
		},
		/**
		 * Move the action at `index` by `delta` positions (reorder).
		 *
		 * @param {number} index Zero-based index into the page's `config.actions`.
		 * @param {number} delta Signed offset — `-1` moves up, `+1` moves down.
		 *   No-op when the resulting position falls outside the array.
		 * @return {void}
		 */
		move(index, delta) {
			const to = index + delta
			if (to < 0 || to >= this.actions.length) return
			const [item] = this.actions.splice(index, 1)
			this.actions.splice(to, 0, item)
		},
	},
}
</script>

<style scoped>
.cn-edit-actions__surface {
	width: 100%;
}

.cn-edit-actions__hint {
	color: var(--color-text-maxcontrast);
	margin-bottom: 12px;
}

.cn-edit-actions__list {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.cn-edit-actions__row {
	display: flex;
	gap: 8px;
	align-items: flex-start;
	padding-bottom: 12px;
	border-bottom: 1px solid var(--color-border);
}

/* One field per line: side by side the four controls have different intrinsic
   heights (the icon trigger and the select are not text inputs), so no
   alignment reads as deliberate. */
.cn-edit-actions__fields {
	display: flex;
	flex-direction: column;
	gap: 8px;
	flex: 1 1 auto;
	min-width: 0;
}

.cn-edit-actions__row-actions {
	display: flex;
	gap: 2px;
}
</style>
