<!--
  CnWidgetWikiRenderer — built-in v2 widget wrapping CnWikiPage.

  Referenced in v2 manifests via `widgetKey: "wiki-renderer"`. Forwards
  all wiki-relevant props to CnWikiPage.

  Spec: REQ-MVR-008 (manifest-v2-renderer) — built-in widget: wiki-renderer
-->
<template>
	<CnWikiPage v-bind="$props" v-on="$listeners" />
</template>

<script>
import CnWikiPage from '../CnWikiPage/CnWikiPage.vue'

export default {
	name: 'CnWidgetWikiRenderer',

	components: { CnWikiPage },

	props: {
		/** The article record to render. Forwarded to CnWikiPage. */
		article: {
			type: Object,
			default: null,
		},
		/** Sidebar tree. Forwarded to CnWikiPage. */
		tree: {
			type: Array,
			default: () => [],
		},
		/** Register slug. Forwarded to CnWikiPage. */
		register: {
			type: String,
			default: '',
		},
		/** Schema slug. Forwarded to CnWikiPage. */
		schema: {
			type: String,
			default: '',
		},
		/** Field name for article content. Forwarded to CnWikiPage. */
		contentField: {
			type: String,
			default: 'body',
		},
		/** Field name for article title. Forwarded to CnWikiPage. */
		titleField: {
			type: String,
			default: 'title',
		},
		/** Route param key for article id. Forwarded to CnWikiPage. */
		idParam: {
			type: String,
			default: 'id',
		},
		/** Sidebar schema slug. Forwarded to CnWikiPage. */
		sidebarSchema: {
			type: String,
			default: '',
		},
		/** Sidebar register slug. Forwarded to CnWikiPage. */
		sidebarRegister: {
			type: String,
			default: '',
		},
	},
}
</script>
