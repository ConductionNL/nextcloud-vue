// Stub for @nextcloud/l10n — returns strings untranslated, safe for styleguide use.
// The real implementation reads Nextcloud globals (document.documentElement.dataset.locale,
// _oc_l10n_registry_translations, etc.) that don't exist in the styleguide environment.
const translate = (app, str) => str
const translatePlural = (app, singular, plural, count) => (count === 1 ? singular : plural)
const getLanguage = () => 'en'
const getLocale = () => 'en_US'
const register = () => {}
const isRTL = () => false
const getFirstDay = () => 1

const l10n = {
	translate,
	translatePlural,
	getLanguage,
	getLocale,
	register,
	isRTL,
	getFirstDay,
}

module.exports = l10n
module.exports.default = l10n
