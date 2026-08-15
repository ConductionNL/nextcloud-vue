import { getLanguage, register } from '@nextcloud/l10n'
import en from '../../l10n/en.json'
import nl from '../../l10n/nl.json'

const BUNDLES = { en, nl }
const APP_NAME = 'nextcloud-vue'

export function registerTranslations() {
	const lang = (getLanguage() || 'en').split(/[-_]/)[0]
	const bundle = BUNDLES[lang] ?? BUNDLES.en
	register(APP_NAME, bundle.translations)
}
