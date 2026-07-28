<template>
	<div class="cn-structured-doc-review" data-testid="cn-structured-doc-review">
		<header class="cn-structured-doc-review__header">
			<div class="cn-structured-doc-review__title-row">
				<h3 v-if="title" class="cn-structured-doc-review__title">
					{{ title }}
				</h3>
				<span class="cn-structured-doc-review__status" :class="statusClass" data-testid="status-pill">
					<span class="cn-structured-doc-review__status-dot" />
					{{ statusLabel }}
				</span>
			</div>
			<p v-if="description" class="cn-structured-doc-review__description">
				{{ description }}
			</p>
		</header>

		<!-- Validation issues banner. -->
		<div v-if="issues.length > 0" class="cn-structured-doc-review__issues" data-testid="issues">
			<h4 class="cn-structured-doc-review__issues-title">
				{{ issuesTitle }}
			</h4>
			<ul>
				<li v-for="(issue, idx) in issues"
					:key="idx"
					class="cn-structured-doc-review__issue"
					:class="'cn-structured-doc-review__issue--' + (issue.severity || 'error')">
					<span class="cn-structured-doc-review__issue-severity">{{ issue.severity || 'error' }}</span>
					<span class="cn-structured-doc-review__issue-message">{{ issue.message }}</span>
					<small v-if="issue.path" class="cn-structured-doc-review__issue-path">{{ issue.path }}</small>
				</li>
			</ul>
		</div>

		<!-- Document body — CnJsonViewer for syntax-highlighted display. -->
		<div class="cn-structured-doc-review__body">
			<CnJsonViewer
				:value="contentText"
				:language="language"
				:read-only="true"
				data-testid="doc-viewer" />
		</div>

		<!-- Reviewer comment + decision row. -->
		<div v-if="showDecision" class="cn-structured-doc-review__decision" data-testid="decision">
			<div class="cn-structured-doc-review__decision-comment">
				<label :for="commentFieldId">{{ commentLabel }}</label>
				<textarea :id="commentFieldId"
					v-model="comment"
					:placeholder="commentPlaceholder"
					:rows="3"
					class="cn-structured-doc-review__textarea"
					:disabled="loading" />
			</div>
			<div class="cn-structured-doc-review__decision-actions">
				<button type="button"
					class="cn-structured-doc-review__action cn-structured-doc-review__action--reject"
					:disabled="loading || (rejectRequiresComment && !comment.trim())"
					@click="emitDecision('reject')">
					{{ rejectLabel }}
				</button>
				<button type="button"
					class="cn-structured-doc-review__action cn-structured-doc-review__action--approve"
					:disabled="loading || hasBlockingIssues"
					@click="emitDecision('approve')">
					{{ approveLabel }}
				</button>
			</div>
		</div>
	</div>
</template>

<script>
import CnJsonViewer from '../CnJsonViewer/CnJsonViewer.vue'

/**
 * CnStructuredDocReview — Structured-document review surface with
 * a syntax-highlighted body, a validation-issues panel, and an
 * approve/reject decision row.
 *
 * For "review an XML / JSON / SOAP / dossier package and sign off"
 * flows where the reviewer needs to see the raw document, the
 * machine-detected issues, and an approve/reject decision in a
 * single screen.
 *
 * The component owns the UI; consumers wire the actual decision
 * persistence in the `@decision` handler.
 *
 * ```vue
 * <CnStructuredDocReview
 *   title="OSO dossier 2026-Q1"
 *   :content="dossierXml"
 *   language="xml"
 *   :issues="validationIssues"
 *   status="needs-review"
 *   @decision="onDecision" />
 * ```
 *
 * ```js
 * function onDecision({ verdict, comment }) {
 *   // verdict: 'approve' | 'reject'
 *   // comment: reviewer's note
 * }
 * ```
 */
export default {
	name: 'CnStructuredDocReview',
	components: { CnJsonViewer },
	props: {
		/** Document title (rendered in the header). */
		title: { type: String, default: '' },
		/** Optional description rendered under the title. */
		description: { type: String, default: '' },
		/**
		 * Document content. Either the raw document text (XML, JSON,
		 * HTML, plain) or an already-parsed JSON object/array, which is
		 * serialised with 2-space indentation before it reaches
		 * `CnJsonViewer` — that component's `value` prop is `String`-typed
		 * and would otherwise fail its own type check.
		 *
		 * @type {string|object|Array}
		 */
		content: { type: [String, Object, Array], default: '' },
		/**
		 * Source language for syntax highlighting. Forwarded to
		 * CnJsonViewer. Common values: `'json' | 'xml' | 'html' |
		 * 'auto'`.
		 *
		 * @type {string}
		 */
		language: { type: String, default: 'auto' },
		/**
		 * Validation issues to render in the issues banner. Each
		 * entry: `{ severity?, message, path? }`. Recognised
		 * severities: `'error' | 'warning' | 'info'`.
		 *
		 * @type {Array<{severity?:string,message:string,path?:string}>}
		 */
		issues: { type: Array, default: () => [] },
		/**
		 * Document review status. Recognised values:
		 * `'valid' | 'invalid' | 'needs-review' | 'approved' |
		 * 'rejected' | 'pending'`. Unknown values render as the
		 * raw string with `unknown` styling.
		 *
		 * @type {string}
		 */
		status: { type: String, default: 'needs-review' },
		/** Override-map keyed by status value for the pill label. */
		statusLabels: {
			type: Object,
			default: () => ({
				valid: 'Valid',
				invalid: 'Invalid',
				'needs-review': 'Needs review',
				approved: 'Approved',
				rejected: 'Rejected',
				pending: 'Pending',
			}),
		},
		/** Hide the bottom decision row entirely (read-only mode). */
		showDecision: { type: Boolean, default: true },
		/** Label for the reviewer-comment textarea. */
		commentLabel: { type: String, default: 'Reviewer comment' },
		/** Placeholder for the comment textarea. */
		commentPlaceholder: { type: String, default: 'Optional notes for the next reviewer or the author.' },
		/** Approve-button label. */
		approveLabel: { type: String, default: 'Approve' },
		/** Reject-button label. */
		rejectLabel: { type: String, default: 'Reject' },
		/** Issues-panel heading. */
		issuesTitle: { type: String, default: 'Validation issues' },
		/** Require a non-empty comment to reject. */
		rejectRequiresComment: { type: Boolean, default: true },
		/** Disable buttons + comment (mid-submit). */
		loading: { type: Boolean, default: false },
	},
	data() {
		return {
			comment: '',
			commentFieldId: 'cn-structured-doc-review-comment-' + Math.random().toString(36).slice(2, 8),
		}
	},
	computed: {
		/**
		 * `content` as the plain string `CnJsonViewer` expects. Objects and
		 * arrays are pretty-printed; anything that cannot be serialised
		 * (a cycle, say) degrades to `String(...)` rather than throwing
		 * during render.
		 *
		 * @return {string} The document text.
		 */
		contentText() {
			if (typeof this.content === 'string') {
				return this.content
			}
			try {
				return JSON.stringify(this.content, null, 2)
			} catch (e) {
				return String(this.content)
			}
		},
		/**
		 * BEM modifier class derived from `status`.
		 *
		 * @return {string} The class.
		 */
		statusClass() {
			const known = ['valid', 'invalid', 'needs-review', 'approved', 'rejected', 'pending']
			const norm = known.includes(this.status) ? this.status : 'unknown'
			return `cn-structured-doc-review__status--${norm}`
		},
		/**
		 * Rendered status label. Falls back to the raw status when
		 * the map has no override.
		 *
		 * @return {string} The label.
		 */
		statusLabel() {
			return this.statusLabels[this.status] || this.status
		},
		/**
		 * Whether any issue's severity is `error` (blocks approval).
		 *
		 * @return {boolean} True when an error-severity issue exists.
		 */
		hasBlockingIssues() {
			return this.issues.some((i) => (i.severity || 'error') === 'error')
		},
	},
	methods: {
		/**
		 * Emit `@decision` with the verdict + reviewer comment.
		 *
		 * @param {'approve'|'reject'} verdict Decision.
		 * @return {void}
		 */
		emitDecision(verdict) {
			/**
			 * @event decision Emitted when the reviewer clicks
			 *   Approve or Reject. Consumers persist + then
			 *   refresh / navigate.
			 * @type {{ verdict: 'approve'|'reject', comment: string }}
			 */
			this.$emit('decision', { verdict, comment: this.comment })
		},
		/**
		 * Public method to reset the reviewer comment field
		 * (consumers call this after a successful decision so the
		 * next dossier opens with a clean comment area).
		 *
		 * @return {void}
		 */
		clearComment() {
			this.comment = ''
		},
	},
}
</script>

<style scoped>
.cn-structured-doc-review {
	display: flex;
	flex-direction: column;
	gap: 12px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	padding: 16px;
	background: var(--color-main-background);
}

.cn-structured-doc-review__title-row {
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: 12px;
}

.cn-structured-doc-review__title {
	margin: 0;
	font-size: 1.2em;
}

.cn-structured-doc-review__description {
	margin: 0;
	color: var(--color-text-maxcontrast);
}

.cn-structured-doc-review__status {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	padding: 2px 10px;
	border-radius: 9999px;
	font-size: 0.85em;
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.05em;
}

.cn-structured-doc-review__status-dot {
	width: 8px;
	height: 8px;
	border-radius: 50%;
	display: inline-block;
	background: currentColor;
}

.cn-structured-doc-review__status--valid,
.cn-structured-doc-review__status--approved {
	background: var(--color-success-hover, rgba(0, 150, 0, 0.1));
	color: var(--color-success);
}

.cn-structured-doc-review__status--invalid,
.cn-structured-doc-review__status--rejected {
	background: var(--color-error-hover, rgba(180, 0, 0, 0.1));
	color: var(--color-error);
}

.cn-structured-doc-review__status--needs-review,
.cn-structured-doc-review__status--pending {
	background: var(--color-warning-hover, rgba(200, 130, 0, 0.1));
	color: var(--color-warning);
}

.cn-structured-doc-review__status--unknown {
	background: var(--color-background-hover);
	color: var(--color-text-maxcontrast);
}

.cn-structured-doc-review__issues {
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	padding: 8px 12px;
	background: var(--color-background-hover);
}

.cn-structured-doc-review__issues-title {
	margin: 0 0 6px;
	font-size: 0.9em;
}

.cn-structured-doc-review__issues ul {
	margin: 0;
	padding: 0;
	list-style: none;
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.cn-structured-doc-review__issue {
	display: flex;
	gap: 8px;
	align-items: baseline;
	font-size: 0.9em;
}

.cn-structured-doc-review__issue-severity {
	text-transform: uppercase;
	font-weight: 600;
	font-size: 0.75em;
	min-width: 56px;
}

.cn-structured-doc-review__issue--error .cn-structured-doc-review__issue-severity {
	color: var(--color-error);
}

.cn-structured-doc-review__issue--warning .cn-structured-doc-review__issue-severity {
	color: var(--color-warning);
}

.cn-structured-doc-review__issue--info .cn-structured-doc-review__issue-severity {
	color: var(--color-primary-element);
}

.cn-structured-doc-review__issue-path {
	font-family: monospace;
	color: var(--color-text-maxcontrast);
}

.cn-structured-doc-review__body {
	max-height: 480px;
	overflow: auto;
}

.cn-structured-doc-review__decision {
	display: flex;
	flex-direction: column;
	gap: 8px;
	border-top: 1px solid var(--color-border);
	padding-top: 12px;
}

.cn-structured-doc-review__textarea {
	width: 100%;
	padding: 6px 10px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	background: var(--color-main-background);
	color: var(--color-main-text);
	resize: vertical;
}

.cn-structured-doc-review__decision-actions {
	display: flex;
	gap: 8px;
	justify-content: flex-end;
}

.cn-structured-doc-review__action {
	padding: 6px 14px;
	border-radius: var(--border-radius);
	border: 1px solid var(--color-border);
	cursor: pointer;
}

.cn-structured-doc-review__action--reject {
	background: var(--color-error-hover, transparent);
	color: var(--color-error);
}

.cn-structured-doc-review__action--approve {
	background: var(--color-primary-element);
	color: var(--color-primary-element-text, #fff);
	border-color: var(--color-primary-element);
}

.cn-structured-doc-review__action:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}
</style>
