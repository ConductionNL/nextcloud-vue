import { setLanguage, translate, translatePlural } from '@nextcloud/l10n'
import { registerTranslations } from '../src/index.js'

import '../src/css/index.css'

// --- Translations -----------------------------------------------------------

// window.t / window.n are read by Vue templates compiled by @nextcloud/vue
// (their `with(this)` scope falls through to globals). Because translate()
// from our mocked @nextcloud/l10n is reactive (see mocks/l10n.js),
// switching language at runtime auto-rerenders dependent components.
window.t = translate
window.n = translatePlural

const initialLang = navigator.language?.split(/[-_]/)[0] || 'en'
setLanguage(initialLang)
registerTranslations()
window.__nclLang = initialLang

window.switchLanguage = (lang) => {
	setLanguage(lang)
	registerTranslations()
	window.__nclLang = lang
}

// --- Component globals ------------------------------------------------------
//
// Global components, directives, `$route`/`$router` and the pinia install used
// to live here. Vue 3 scopes all of them to an app instance rather than to a
// global constructor, and vue-styleguidist builds one app per example, so they
// moved to enhance-app.js, which styleguidist calls with each preview app.
