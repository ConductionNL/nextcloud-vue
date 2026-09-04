import { getLanguage, register } from '@nextcloud/l10n'
import be from '../../l10n/be.json'
import bg from '../../l10n/bg.json'
import bs from '../../l10n/bs.json'
import ca from '../../l10n/ca.json'
import cs from '../../l10n/cs.json'
import da from '../../l10n/da.json'
import de from '../../l10n/de.json'
import el from '../../l10n/el.json'
import en from '../../l10n/en.json'
import es from '../../l10n/es.json'
import et from '../../l10n/et.json'
import fi from '../../l10n/fi.json'
import fr from '../../l10n/fr.json'
import ga from '../../l10n/ga.json'
import hr from '../../l10n/hr.json'
import hu from '../../l10n/hu.json'
import is from '../../l10n/is.json'
import it from '../../l10n/it.json'
import lb from '../../l10n/lb.json'
import lt from '../../l10n/lt.json'
import lv from '../../l10n/lv.json'
import mk from '../../l10n/mk.json'
import mt from '../../l10n/mt.json'
import nb from '../../l10n/nb.json'
import nl from '../../l10n/nl.json'
import pl from '../../l10n/pl.json'
import pt from '../../l10n/pt.json'
import rm from '../../l10n/rm.json'
import ro from '../../l10n/ro.json'
import ru from '../../l10n/ru.json'
import sk from '../../l10n/sk.json'
import sl from '../../l10n/sl.json'
import sq from '../../l10n/sq.json'
import sr from '../../l10n/sr.json'
import sv from '../../l10n/sv.json'
import tr from '../../l10n/tr.json'
import uk from '../../l10n/uk.json'

// One entry per locale the Conduction fleet targets (the keepiq locale set).
// Only en and nl are anywhere near complete; the others carry what has been
// translated so far, and every key they lack falls back to the English source
// string at t() time — so a sparse catalog is strictly better than none.
const BUNDLES = {
	be,
	bg,
	bs,
	ca,
	cs,
	da,
	de,
	el,
	en,
	es,
	et,
	fi,
	fr,
	ga,
	hr,
	hu,
	is,
	it,
	lb,
	lt,
	lv,
	mk,
	mt,
	nb,
	nl,
	pl,
	pt,
	rm,
	ro,
	ru,
	sk,
	sl,
	sq,
	sr,
	sv,
	tr,
	uk,
}
const APP_NAME = 'nextcloud-vue'

export function registerTranslations() {
	const lang = (getLanguage() || 'en').split(/[-_]/)[0]
	const bundle = BUNDLES[lang] ?? BUNDLES.en
	register(APP_NAME, bundle.translations)
}
