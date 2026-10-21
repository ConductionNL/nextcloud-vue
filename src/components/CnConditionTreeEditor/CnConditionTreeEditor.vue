<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
  -->
<template>
	<div class="cn-condition-tree-editor" data-testid="cn-condition-tree-editor">
		<CnConditionTreeNode
			:node="tree"
			:depth="0"
			:fieldOptions="fieldOptions"
			:operators="operators"
			:errors="allErrors"
			:emptyText="emptyText"
			@update:node="onTreeUpdate" />

		<div
			v-if="previewEndpoint && previewEndpoint.url"
			class="cn-condition-tree-editor__preview"
			role="status"
			aria-live="polite"
			data-testid="cn-condition-tree-preview">
			<template v-if="status === 'checking'">
				<NcLoadingIcon :size="16" />
				{{ t('nextcloud-vue', 'Checking the conditions…') }}
			</template>
			<template v-else-if="status === 'valid'">
				<span class="cn-condition-tree-editor__count">
					{{ countLabel || t('nextcloud-vue', 'Matches:') }}
					<strong data-testid="cn-condition-tree-count">{{ count }}</strong>
				</span>
				<span v-if="countNote">{{ countNote }}</span>
			</template>
			<span v-else-if="status === 'incomplete'">
				{{ t('nextcloud-vue', 'Complete every condition to see how many match.') }}
			</span>
		</div>

		<NcNoteCard v-if="generalError" type="error" class="cn-condition-tree-editor__error">
			{{ generalError }}
		</NcNoteCard>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcLoadingIcon, NcNoteCard } from '@nextcloud/vue'
import CnConditionTreeNode from './CnConditionTreeNode.vue'

const PREVIEW_DEBOUNCE_MS = 400

// A validator names the failing node in front of its message:
// `$.children[1].children[0]: field "x" is not declared.`
const ERROR_PATH = /^(\$(?:\.children\[\d+\])*):\s*([\s\S]*)$/

/**
 * An empty tree: one AND group without conditions.
 *
 * @return {{type: string, children: Array}}
 */
function emptyTree() {
	return { type: 'AND', children: [] }
}

/**
 * A deep copy of a tree, or an empty tree for anything else.
 *
 * @param {unknown} node The tree.
 * @return {object}
 */
function cloneTree(node) {
	if (!node || typeof node !== 'object' || !Array.isArray(node.children)) {
		return emptyTree()
	}
	return JSON.parse(JSON.stringify(node))
}

/**
 * How many conditions a tree holds, and how many are unfinished: no field,
 * no operator or no value, or a group without conditions.
 *
 * @param {object} node The tree.
 * @return {{leaves: number, unfinished: number}}
 */
export function tallyConditions(node) {
	if (Array.isArray(node && node.children)) {
		if (node.children.length === 0) {
			return { leaves: 0, unfinished: 1 }
		}
		return node.children.reduce((sum, child) => {
			const sub = tallyConditions(child)
			return { leaves: sum.leaves + sub.leaves, unfinished: sum.unfinished + sub.unfinished }
		}, { leaves: 0, unfinished: 0 })
	}
	const noValue = node?.value === '' || node?.value === null || node?.value === undefined
	return { leaves: 1, unfinished: (!node?.field || !node?.operator || noValue) ? 1 : 0 }
}

/**
 * CnConditionTreeEditor - AND/OR groups of conditions (field, operator,
 * value) to any depth, for a rule that decides which records belong: a
 * segment's members, a saved view's rows, an audience. Every control is a
 * select, field or button, so the whole tree is built with the keyboard.
 *
 * With `previewEndpoint` the editor posts the finished tree to the app,
 * debounced, and shows how many records match. A validation error whose
 * message starts with a node path (`$.children[1]: ...`) is shown at that
 * node; `errors` places the app's own errors the same way.
 *
 * ```vue
 * <CnConditionTreeEditor
 *   v-model="rules"
 *   :field-options="[{ value: 'city', label: 'City', type: 'string' }, { value: 'createdAt', label: 'Created', type: 'string', format: 'date' }]"
 *   :preview-endpoint="{ url: '/apps/myapp/api/segments/preview', body: { entityType: 'contact' }, countPath: 'estimatedSize' }"
 *   count-label="Estimated members:" />
 * ```
 *
 * @spec openspec/changes/condition-tree-editor/specs/condition-tree-editor/spec.md#requirement-a-user-builds-andor-groups-of-conditions
 */
export default {
	name: 'CnConditionTreeEditor',

	components: {
		CnConditionTreeNode,
		NcLoadingIcon,
		NcNoteCard,
	},

	props: {
		/**
		 * The tree: `{ type: 'AND'|'OR', children: [...] }`, a child being a
		 * group or a condition `{ field, operator, value }`.
		 *
		 * @type {object}
		 */
		modelValue: {
			type: Object,
			default: () => emptyTree(),
		},

		/**
		 * The fields a condition can test: `[{ value, label, type, format? }]`,
		 * `type` being `string`, `integer`, `number`, `boolean` or `array`, and
		 * `format: 'date'` a date. Labels go through the app's translate.
		 *
		 * @type {Array<{value: string, label: string, type?: string, format?: string}>}
		 */
		fieldOptions: {
			type: Array,
			default: () => [],
		},

		/**
		 * Operators per field type, `{ string: [{ value, label }], ... }`,
		 * replacing the defaults for the types it names.
		 *
		 * @type {object|null}
		 */
		operators: {
			type: Object,
			default: null,
		},

		/**
		 * Where a finished tree is checked and counted: `{ url, method?, body?,
		 * rulesKey?, countPath?, validPath?, errorPath? }`. The tree is posted as
		 * `body[rulesKey]` (default `rules`); the answer's `validPath` (default
		 * `valid`) false shows its `errorPath` (default `error`), else the
		 * count at `countPath` (default `count`).
		 *
		 * @type {object|null}
		 */
		previewEndpoint: {
			type: Object,
			default: null,
		},

		/**
		 * Error messages by node path (`$`, `$.children[1]`, ...).
		 *
		 * @type {object}
		 */
		errors: {
			type: Object,
			default: () => ({}),
		},

		/**
		 * The words before the count (default "Matches:").
		 *
		 * @type {string}
		 */
		countLabel: {
			type: String,
			default: '',
		},

		/**
		 * A line after the count.
		 *
		 * @type {string}
		 */
		countNote: {
			type: String,
			default: '',
		},

		/**
		 * Shown in an empty tree.
		 *
		 * @type {string}
		 */
		emptyText: {
			type: String,
			default: '',
		},
	},

	emits: ['update:modelValue', 'status-change', 'validity-change'],

	data() {
		return {
			tree: cloneTree(this.modelValue),
			// empty | incomplete | checking | valid | invalid | failed
			status: 'empty',
			count: null,
			previewErrors: {},
			generalError: '',
			previewTimer: null,
			requestSeq: 0,
		}
	},

	computed: {
		allErrors() {
			return { ...this.previewErrors, ...(this.errors || {}) }
		},
	},

	watch: {
		modelValue(next) {
			if (JSON.stringify(next) !== JSON.stringify(this.tree)) {
				this.tree = cloneTree(next)
				this.evaluate()
			}
		},

		status(next) {
			/**
			 * The tree's state: `empty`, `incomplete`, `checking`, `valid`, `invalid` or `failed`.
			 *
			 * @type {string}
			 */
			this.$emit('status-change', next)
			/**
			 * Whether the tree is complete and, with a preview endpoint, accepted.
			 *
			 * @type {boolean}
			 */
			this.$emit('validity-change', next === 'valid')
		},
	},

	mounted() {
		this.$emit('status-change', this.status)
		this.evaluate()
	},

	beforeUnmount() {
		clearTimeout(this.previewTimer)
	},

	methods: {
		t,

		onTreeUpdate(updated) {
			this.tree = updated
			/**
			 * The new tree.
			 *
			 * @type {object}
			 */
			this.$emit('update:modelValue', cloneTree(updated))
			this.evaluate()
		},

		/**
		 * Judge the tree: empty, incomplete, or complete; a complete tree is
		 * checked and counted at the preview endpoint after a pause in typing,
		 * and without one it is valid as it stands.
		 */
		evaluate() {
			clearTimeout(this.previewTimer)
			this.requestSeq++
			this.previewErrors = {}
			this.generalError = ''
			this.count = null
			const { leaves, unfinished } = tallyConditions(this.tree)
			if (leaves === 0 && this.tree.children.length === 0) {
				this.status = 'empty'
				return
			}
			if (unfinished > 0) {
				this.status = 'incomplete'
				return
			}
			if (!this.previewEndpoint || !this.previewEndpoint.url) {
				this.status = 'valid'
				return
			}
			this.status = 'checking'
			this.previewTimer = setTimeout(() => this.runPreview(), PREVIEW_DEBOUNCE_MS)
		},

		async runPreview() {
			const seq = this.requestSeq
			const ep = this.previewEndpoint
			let data
			try {
				const [{ default: axios }, { generateUrl }] = await Promise.all([
					import('@nextcloud/axios'),
					import('@nextcloud/router'),
				])
				const url = /^https?:\/\//i.test(ep.url) ? ep.url : generateUrl(ep.url)
				const body = { ...(ep.body || {}), [ep.rulesKey || 'rules']: this.tree }
				const method = String(ep.method || 'POST').toLowerCase() === 'put' ? 'put' : 'post'
				const response = await axios[method](url, body)
				data = response && response.data
			} catch {
				data = null
			}
			if (seq !== this.requestSeq) {
				return
			}
			if (!data || typeof data !== 'object') {
				this.status = 'failed'
				this.generalError = t('nextcloud-vue', 'The conditions could not be checked.')
				return
			}
			if (this.read(data, ep.validPath || 'valid') === false) {
				this.status = 'invalid'
				this.placeError(this.read(data, ep.errorPath || 'error') || t('nextcloud-vue', 'These conditions are not valid.'))
				return
			}
			this.count = this.read(data, ep.countPath || 'count') ?? 0
			this.status = 'valid'
		},

		read(data, path) {
			return String(path).split('.').reduce((o, k) => (o === null || o === undefined ? undefined : o[k]), data)
		},

		/**
		 * Show a validation message at the node its path names, or above the
		 * tree when it names none.
		 *
		 * @param {string} message The message.
		 */
		placeError(message) {
			const match = ERROR_PATH.exec(String(message))
			if (match && match[1] !== '$') {
				this.previewErrors = { [match[1]]: match[2] }
				return
			}
			this.generalError = match ? match[2] : String(message)
		},
	},
}
</script>

<style scoped>
.cn-condition-tree-editor {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.cn-condition-tree-editor__preview {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 8px;
	color: var(--color-text-maxcontrast);
}

.cn-condition-tree-editor__count {
	color: var(--color-main-text);
}
</style>
