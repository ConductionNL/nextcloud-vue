<!--
  CnEditMenuModal — edit the working manifest's left navigation (ADR-041 / ADR-004).

  Mutates the passed `working` manifest copy ONLY (never the base): add, remove,
  reorder, relabel, re-icon, re-route and nest `menu[]` entries. Renders the menu
  as a TREE (CnMenuTreeNode) — each item is a compact row with an edit cog that
  reveals its Label / Icon / Route fields, plus reorder / delete / add-sub-item.
  Isolated NcDialog file per ADR-004 modal isolation.
-->
<template>
	<NcDialog size="normal" :name="t('nextcloud-vue', 'Edit menu')" @closing="$emit('close')">
		<CnMenuTreeNode :list="menu"
			:max-depth="1"
			:pages="pageOptions" />

		<template #actions>
			<NcButton variant="secondary" @click="add">
				<template #icon>
					<Plus :size="20" />
				</template>
				{{ t('nextcloud-vue', 'Add menu item') }}
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
import { NcDialog, NcButton, NcLoadingIcon } from '@nextcloud/vue'
import { translate as t } from '@nextcloud/l10n'
import Plus from 'vue-material-design-icons/Plus.vue'
import ContentSaveOutline from 'vue-material-design-icons/ContentSaveOutline.vue'
import CnMenuTreeNode from '../components/CnMenuTreeNode/CnMenuTreeNode.vue'
import manifestModalDoneMixin from '../mixins/manifestModalDoneMixin.js'

export default {
	name: 'CnEditMenuModal',

	components: { NcDialog, NcButton, NcLoadingIcon, Plus, ContentSaveOutline, CnMenuTreeNode },

	mixins: [manifestModalDoneMixin],

	props: {
		/**
		 * The working manifest copy whose `menu[]` is edited in place. Never the
		 * base — the editor holds the base separately.
		 *
		 * @type {object|null}
		 */
		working: {
			type: Object,
			default: null,
		},
	},

	emits: ['close'],

	computed: {
		/** The working manifest's menu array (always an array). */
		menu() {
			// Lazily normalise the working copy's `menu` to an array so the tree
			// editor always has a mutable list to edit in place (the working
			// manifest is ours to mutate by design — never the base).
			// eslint-disable-next-line vue/no-mutating-props, vue/no-side-effects-in-computed-properties
			if (this.working && !Array.isArray(this.working.menu)) this.working.menu = []
			return this.working ? this.working.menu : []
		},

		/**
		 * The manifest's pages as Route-dropdown options. A menu item's `route`
		 * holds the target page's id (the vue-router route name), so the option
		 * `value` is `page.id` and the label is its title (falling back to id).
		 *
		 * Detail pages — those whose route carries a dynamic segment like
		 * `/dogs/:id` — are EXCLUDED: they need a concrete record id to resolve,
		 * so navigating to one straight from the menu yields a blank page. Detail
		 * pages are reached from their index (clicking a row), never the menu.
		 *
		 * @return {Array<{value: string, label: string}>}
		 */
		pageOptions() {
			const pages = (this.working && Array.isArray(this.working.pages)) ? this.working.pages : []
			return pages
				.filter((p) => p && typeof p.id === 'string' && p.id !== '')
				.filter((p) => !String(p.route || '').includes(':'))
				.map((p) => ({ value: p.id, label: (typeof p.title === 'string' && p.title) ? p.title : p.id }))
		},
	},

	methods: {
		t,
		/** Append a new blank top-level menu entry (ordered last). */
		add() {
			const maxOrder = this.menu.reduce((m, i) => Math.max(m, typeof i.order === 'number' ? i.order : 0), 0)
			this.menu.push({ id: `menu-${this.menu.length + 1}`, label: '', icon: '', route: '', order: maxOrder + 10 })
		},
	},
}
</script>

<!-- No style block: NcDialog owns the padding, the title (via `name`) and the
     actions row, so the wrapper, heading and footer rules the NcModal markup
     needed are all gone. An empty `<style scoped>` would still bake a
     data-v-* scope id into the built JS with no matching CSS rule, which
     the check:css-entry gate rejects. -->
