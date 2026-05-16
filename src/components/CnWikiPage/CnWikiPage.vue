<!--
  CnWikiPage — Manifest-driven markdown article surface.

  Renders one wiki / docs / knowledge-base article declared in
  `pages[].config` for `type: "wiki"` pages. Closes the gap that
  forces every consumer's docs / help / article-detail route onto
  `type: "custom"`.

  The page reads its content from props rather than fetching itself.
  Following the precedent set by CnFilesPage and CnFormPage, the
  consumer (or a wiki-aware wrapper) populates `article` (object)
  and `tree` (array) — typically from a `useDetailView()` /
  list-call against the manifest-declared register/schema. This
  keeps the lib zero-dep on a particular OpenRegister fetcher
  while still making the manifest config the source of truth for
  field names.

  Markdown rendering is delegated to the `cnRenderMarkdown` composable
  which configures `marked` with `{ gfm: true, breaks: false }` —
  GitHub-flavoured markdown, no auto-`<br>` on newlines.

  Slots:
    - `#header`  — overrides the default header. Scope `{ title, article }`.
    - `#sidebar` — overrides the default tree sidebar. Scope `{ tree, onClick }`.
    - `#body`    — overrides the default markdown body. Scope `{ article, html }`.
    - `#empty`   — replaces the empty-state when `article` is null.

  Events:
    - `@tree-click` — `node` whenever a sidebar tree node is clicked.
    - `@error`      — error object if markdown parsing throws.

  Spec: REQ-MWPT-* (manifest-wiki-page-type).
-->
<template>
	<div class="cn-wiki-page" data-testid="cn-wiki-page" :class="{ 'cn-wiki-page--has-sidebar': hasSidebar }">
		<!--
			@slot sidebar
			@description Replaces the default sidebar tree. Scoped props `{ tree, onClick }` —
			`onClick(node)` re-emits `@tree-click` with the node.
		-->
		<slot
			v-if="hasSidebar"
			name="sidebar"
			:tree="tree"
			:on-click="onTreeClick">
			<nav class="cn-wiki-page__sidebar">
				<ul class="cn-wiki-page__tree">
					<CnWikiTreeNode
						v-for="node in tree"
						:key="treeKey(node)"
						:node="node"
						:title-field="effectiveSidebarTitleField"
						:tree-field="treeField"
						@click="onTreeClick" />
				</ul>
			</nav>
		</slot>

		<div class="cn-wiki-page__main">
			<!--
				@slot header
				@description Replaces the default page header. Scoped props `{ title, article }`.
			-->
			<slot
				name="header"
				:title="resolvedTitle"
				:article="article">
				<header v-if="resolvedTitle" class="cn-wiki-page__header">
					<h1 class="cn-wiki-page__title">
						{{ resolvedTitle }}
					</h1>
				</header>
			</slot>

			<!--
				@slot empty
				@description Replaces the empty-state shown when `article` is null/undefined.
			-->
			<slot v-if="!article" name="empty">
				<NcEmptyContent
					:name="emptyText"
					:description="emptyDescription">
					<template #icon>
						<FileDocumentOutline :size="64" />
					</template>
				</NcEmptyContent>
			</slot>

			<!--
				@slot body
				@description Replaces the default markdown body. Scoped props `{ article, html }` —
				`html` is the pre-parsed markdown so a custom renderer can wrap it.
			-->
			<slot
				v-else
				name="body"
				:article="article"
				:html="renderedBody">
				<div
					v-if="renderedBody"
					class="cn-wiki-page__body"
					v-html="renderedBody" /><!-- eslint-disable-line vue/no-v-html -->
				<NcEmptyContent
					v-else
					:name="emptyBodyText"
					:description="emptyBodyDescription">
					<template #icon>
						<FileDocumentOutline :size="64" />
					</template>
				</NcEmptyContent>
			</slot>
		</div>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcEmptyContent } from '@nextcloud/vue'
import FileDocumentOutline from 'vue-material-design-icons/FileDocumentOutline.vue'
import { cnRenderMarkdown } from '../../composables/cnRenderMarkdown.js'
import CnWikiTreeNode from './CnWikiTreeNode.vue'

/**
 * CnWikiPage — Manifest-driven markdown article surface.
 *
 * Reads `article` (object) and `tree` (array) as props rather than
 * fetching itself; consumers populate these from their own data
 * store or a wrapper composable. The manifest config still drives
 * which fields/registers are involved (via `contentField`,
 * `titleField`, `sidebarSchema`, …) so the validator stays
 * meaningful even though the lib does not own the fetch.
 *
 * Basic usage:
 *
 *   <CnWikiPage
 *     :article="article"
 *     :register="'pipelinq'"
 *     :schema="'article'"
 *     :content-field="'body'" />
 *
 * With sidebar tree:
 *
 *   <CnWikiPage
 *     :article="article"
 *     :tree="categoryTree"
 *     :sidebar-schema="'category'"
 *     @tree-click="onCategoryClick" />
 */
export default {
	name: 'CnWikiPage',

	components: {
		NcEmptyContent,
		FileDocumentOutline,
		CnWikiTreeNode,
	},

	props: {
		/**
		 * The article record to render. When null/undefined the
		 * component shows its empty-state. The shape is consumer-defined;
		 * the component reads only `article[contentField]` and
		 * `article[titleField]`.
		 *
		 * @type {object|null}
		 */
		article: {
			type: Object,
			default: null,
		},
		/**
		 * The (optional) sidebar tree. Each node:
		 * `{ id, [titleField], children?: [...] }`. Empty array hides
		 * the sidebar entirely.
		 *
		 * @type {Array<object>}
		 */
		tree: {
			type: Array,
			default: () => [],
		},
		/**
		 * OpenRegister register slug. Informational at this layer
		 * (the consumer does the fetch); declared as a prop so the
		 * manifest-driven prop forwarder in CnPageRenderer surfaces it
		 * for child components / debugging.
		 */
		register: {
			type: String,
			default: '',
		},
		/**
		 * OpenRegister schema slug. Informational at this layer —
		 * see `register` above.
		 */
		schema: {
			type: String,
			default: '',
		},
		/**
		 * Property on `article` holding the markdown body. Defaults
		 * to `'body'`.
		 */
		contentField: {
			type: String,
			default: 'body',
		},
		/**
		 * Property on `article` holding the page title. Defaults
		 * to `'title'`.
		 */
		titleField: {
			type: String,
			default: 'title',
		},
		/**
		 * `$route.params` key holding the article id. Informational at
		 * this layer; declared so the consumer's data store can wire
		 * the same default the validator and renderer both reference.
		 */
		idParam: {
			type: String,
			default: 'id',
		},
		/**
		 * Schema slug for the sidebar tree. When set AND `tree` is
		 * non-empty the sidebar renders. Unset suppresses the sidebar
		 * regardless of `tree` content.
		 */
		sidebarSchema: {
			type: String,
			default: '',
		},
		/**
		 * Register slug for the sidebar tree. Defaults to `register`
		 * when unset (the common case).
		 */
		sidebarRegister: {
			type: String,
			default: '',
		},
		/**
		 * Property on each sidebar node holding its child array.
		 * Defaults to `'children'`.
		 */
		treeField: {
			type: String,
			default: 'children',
		},
		/**
		 * Property on each sidebar node holding its label. Defaults
		 * to `titleField` (so `'title'` unless overridden).
		 */
		sidebarTitleField: {
			type: String,
			default: '',
		},
		/** Empty-state heading when `article` is null. */
		emptyText: {
			type: String,
			default: () => t('nextcloud-vue', 'Article not found'),
		},
		/** Empty-state description when `article` is null. */
		emptyDescription: {
			type: String,
			default: () => t('nextcloud-vue', 'The requested article could not be found.'),
		},
		/** Empty-body heading when the article has no `contentField`. */
		emptyBodyText: {
			type: String,
			default: () => t('nextcloud-vue', 'No content'),
		},
		/** Empty-body description when the article has no `contentField`. */
		emptyBodyDescription: {
			type: String,
			default: () => t('nextcloud-vue', 'This article has no content yet.'),
		},
	},

	emits: [
		/**
		 * Emitted when a sidebar tree node is clicked. The payload is
		 * the clicked node object (the same shape the consumer placed
		 * in `tree`).
		 */
		'tree-click',
		/**
		 * Emitted when markdown parsing throws. Rare — `marked` and
		 * the helper are defensive — but the contract is explicit so
		 * consumers can log / surface a banner.
		 */
		'error',
	],

	computed: {
		/**
		 * Effective sidebar-title field — falls back to the article
		 * title field when unset so consumers can leave it off in
		 * the simple case.
		 */
		effectiveSidebarTitleField() {
			return this.sidebarTitleField || this.titleField
		},
		/**
		 * Whether the sidebar should render. Both a non-empty tree
		 * AND an explicit `sidebarSchema` are required — the schema
		 * acts as the manifest-author's "yes, I want a sidebar" signal,
		 * matching the spec's REQ-MWPT-5.
		 */
		hasSidebar() {
			return Boolean(this.sidebarSchema) && Array.isArray(this.tree) && this.tree.length > 0
		},
		/** Article title resolved through `titleField`. */
		resolvedTitle() {
			if (!this.article) return ''
			const value = this.article[this.titleField]
			return typeof value === 'string' ? value : ''
		},
		/**
		 * Article body parsed to HTML through `cnRenderMarkdown`.
		 * Empty string when the article is null or has no body.
		 */
		renderedBody() {
			if (!this.article) return ''
			const source = this.article[this.contentField]
			try {
				return cnRenderMarkdown(source)
			} catch (error) {
				this.$emit('error', error)
				return ''
			}
		},
	},

	methods: {
		/**
		 * Re-emit `@tree-click` with the clicked node.
		 *
		 * @param {object} node The tree node the user clicked.
		 */
		onTreeClick(node) {
			this.$emit('tree-click', node)
		},
		/**
		 * Stable v-for key for tree nodes — prefer `id`, fall back
		 * to the title field, finally to JSON-stringified shape.
		 *
		 * @param {object} node Tree node.
		 * @return {string}
		 */
		treeKey(node) {
			if (!node) return ''
			if (typeof node.id === 'string' || typeof node.id === 'number') return String(node.id)
			const title = node[this.effectiveSidebarTitleField]
			if (typeof title === 'string') return title
			return JSON.stringify(node)
		},
	},
}
</script>

<style scoped>
.cn-wiki-page {
	display: flex;
	gap: 24px;
	padding: 20px;
	max-width: 1200px;
	margin: 0 auto;
}

.cn-wiki-page__sidebar {
	flex: 0 0 240px;
	border-right: 1px solid var(--color-border);
	padding-right: 16px;
}

.cn-wiki-page__tree {
	list-style: none;
	margin: 0;
	padding: 0;
}

.cn-wiki-page__main {
	flex: 1 1 auto;
	min-width: 0;
}

.cn-wiki-page__header {
	margin-bottom: 16px;
}

.cn-wiki-page__title {
	font-size: 1.6em;
	margin: 0;
	color: var(--color-main-text);
}

.cn-wiki-page__body {
	line-height: 1.7;
	color: var(--color-main-text);
}

.cn-wiki-page__body :deep(h1),
.cn-wiki-page__body :deep(h2),
.cn-wiki-page__body :deep(h3) {
	color: var(--color-main-text);
	margin-top: 1.4em;
	margin-bottom: 0.5em;
}

.cn-wiki-page__body :deep(p) {
	margin: 0 0 1em;
}

.cn-wiki-page__body :deep(code) {
	background: var(--color-background-dark);
	padding: 2px 6px;
	border-radius: var(--border-radius);
	font-family: var(--font-face-monospace, monospace);
	font-size: 0.9em;
}

.cn-wiki-page__body :deep(pre) {
	background: var(--color-background-dark);
	padding: 12px;
	border-radius: var(--border-radius);
	overflow-x: auto;
}

.cn-wiki-page__body :deep(pre code) {
	background: transparent;
	padding: 0;
}

.cn-wiki-page__body :deep(blockquote) {
	border-left: 3px solid var(--color-border);
	padding-left: 12px;
	color: var(--color-text-lighter);
	margin: 0 0 1em;
}

.cn-wiki-page__body :deep(table) {
	border-collapse: collapse;
	margin: 0 0 1em;
}

.cn-wiki-page__body :deep(th),
.cn-wiki-page__body :deep(td) {
	border: 1px solid var(--color-border);
	padding: 6px 10px;
}

.cn-wiki-page--has-sidebar .cn-wiki-page__main {
	padding-left: 8px;
}
</style>
