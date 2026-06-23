<!--
  CnEditPagesModal — edit the app's pages (ADR-041 / ADR-004).

  Mutates the working manifest copy ONLY: add, remove, reorder, relabel,
  re-type, re-parent and re-route the manifest's `pages[]`. Renders the pages as
  a compact TREE (CnPageTreeNode) — each page is a one-line row with an edit cog
  that reveals its Title / Type / Parent / Route, plus reorder, delete and
  add-sub-page — mirroring the menu editor. The hierarchy comes from each page's
  `parent` (a parent page's id), so an index and its detail nest together and
  the detail's route builds up from the index's. Isolated NcModal file per
  ADR-004.
-->
<template>
	<NcModal size="normal" @close="$emit('close')">
		<div class="cn-edit-pages">
			<h2 class="cn-edit-pages__title">
				{{ t('nextcloud-vue', 'Edit pages') }}
			</h2>

			<NcEmptyContent
				v-if="!pages.length"
				:name="t('nextcloud-vue', 'No pages yet')"
				:description="t('nextcloud-vue', 'Add a page to get started.')" />

			<CnPageTreeNode v-else
				:list="pages"
				:parent-id="''"
				:depth="0"
				:max-depth="1" />

			<div class="cn-edit-pages__footer">
				<NcButton type="secondary" @click="add">
					<template #icon>
						<Plus :size="20" />
					</template>
					{{ t('nextcloud-vue', 'Add page') }}
				</NcButton>
				<NcButton type="primary" @click="$emit('close')">
					{{ t('nextcloud-vue', 'Done') }}
				</NcButton>
			</div>
		</div>
	</NcModal>
</template>

<script>
import { NcModal, NcButton, NcEmptyContent } from '@nextcloud/vue'
import { translate as t } from '@nextcloud/l10n'
import Plus from 'vue-material-design-icons/Plus.vue'
import CnPageTreeNode from '../components/CnPageTreeNode/CnPageTreeNode.vue'

export default {
	name: 'CnEditPagesModal',

	components: { NcModal, NcButton, NcEmptyContent, Plus, CnPageTreeNode },

	props: {
		/**
		 * The working manifest copy whose `pages[]` is edited in place. Never the
		 * base — the editor holds the base separately.
		 *
		 * @type {object|null}
		 */
		working: {
			type: Object,
			default: null,
		},
	},

	computed: {
		/** The working manifest's pages array (always an array). */
		pages() {
			if (this.working && !Array.isArray(this.working.pages)) {
				// The working manifest is ours to mutate by design — never the base.
				// eslint-disable-next-line vue/no-mutating-props, vue/no-side-effects-in-computed-properties
				this.working.pages = []
			}
			return this.working ? this.working.pages : []
		},
	},

	methods: {
		t,
		/** Append a new blank top-level page with a unique stable id. */
		add() {
			let n = this.pages.length + 1
			const ids = new Set(this.pages.map((p) => p && p.id))
			while (ids.has(`page-${n}`)) n++
			const id = `page-${n}`
			this.pages.push({ id, route: `/${id}`, type: 'custom', title: '', config: {} })
		},
	},
}
</script>

<style scoped>
.cn-edit-pages {
	padding: 20px;
}

.cn-edit-pages__title {
	margin-top: 0;
}

.cn-edit-pages__footer {
	display: flex;
	justify-content: space-between;
	margin-top: 16px;
}
</style>
