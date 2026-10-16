<!--
  CnHeaderSearchLabel — the app's own words on the search field in Nextcloud's
  header (screens-board-top-bar-search). Renders nothing of its own.

  Under the board look the screens give the top bar's search field a line that
  names what the app holds ("Zoek zaken, documenten of contacten"), where
  Nextcloud shows its global "Search apps, files, tags, messages …". Nextcloud
  offers no way for an app to set that line, so this component replaces the
  TEXT of the field's label and nothing else:
    - it changes only the text of `.unified-search-input__label` (which is also
      the search button's accessible name); it never adds, moves or removes a node;
    - it writes the text again when Nextcloud re-renders the field, and only
      when the text differs, so its own write never loops;
    - on unmount it puts Nextcloud's text back;
    - with no header or no such label it does nothing.

  The search Nextcloud opens is unchanged: this is the resting field's line.
-->
<script>
const LABEL_SELECTOR = '.unified-search-input__label'

/**
 * Put the app's own line on the search field in Nextcloud's header.
 *
 * @spec openspec/changes/screens-board-top-bar-search/specs/layout-components/spec.md#requirement-the-board-look-names-what-the-header-search-finds
 */
export default {
	name: 'CnHeaderSearchLabel',

	props: {
		/**
		 * The line to show, already translated.
		 *
		 * @type {string}
		 */
		label: {
			type: String,
			required: true,
		},
	},

	data() {
		return { observer: null, original: null, labelNode: null }
	},

	watch: {
		label() {
			this.apply()
		},
	},

	mounted() {
		const header = document.getElementById('header')
		if (!header) {
			return
		}
		this.apply()
		if (typeof MutationObserver === 'function') {
			this.observer = new MutationObserver(() => this.apply())
			this.observer.observe(header, { childList: true, subtree: true, characterData: true })
		}
	},

	beforeUnmount() {
		this.observer?.disconnect()
		this.observer = null
		if (this.labelNode && this.original !== null && this.labelNode.isConnected) {
			this.labelNode.textContent = this.original
		}
		this.labelNode = null
		this.original = null
	},

	methods: {
		/**
		 * Write the line into the label when it shows something else.
		 * Remembers the first text Nextcloud drew in each label node, to put back.
		 *
		 * @return {void}
		 */
		apply() {
			const node = document.querySelector('#header ' + LABEL_SELECTOR)
			if (!node || !this.label) {
				return
			}
			if (node !== this.labelNode) {
				this.labelNode = node
				this.original = node.textContent
			}
			if (node.textContent.trim() === this.label) {
				return
			}
			// Keep Nextcloud's own text node where there is one, so its renderer still holds the live node.
			const text = node.childNodes.length === 1 && node.firstChild.nodeType === 3 ? node.firstChild : null
			if (text) {
				text.data = this.label
			} else {
				node.textContent = this.label
			}
		},
	},

	render() {
		return null
	},
}
</script>
