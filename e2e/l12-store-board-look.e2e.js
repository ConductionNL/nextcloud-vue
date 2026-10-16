// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// The store page under the board look (?l7=store-board-look, harness
// l7/StoreBoardLook.vue) measured against board PqStore: chips with counts and
// the search on one row, three cards a row with a state pill and one action,
// a side column of at most 300px beside them, and a footnote.
//
// WHY PLAYWRIGHT: the claim is the computed layout of the real stylesheet.

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

const card = (slug, title, typeName, publisher, description, extra = {}) => ({ slug, title, typeName, publisher, description, version: '1.0.0', ...extra })

const CARDS = [
	card('b2b', 'B2B-verkooppipeline', 'Pipelinesjabloon', 'Conduction', 'Van kwalificatie tot afsluiten, met de fases die een langere deal doorloopt.', { kind: 'pipeline', version: '1.3.0', installed: true, openUrl: '#b2b' }),
	card('routing', 'Routering voor de servicedesk', 'Routering via wachtrijen', 'Conduction', 'Wachtrijen en vaardigheden die een binnenkomend verzoek bij iemand leggen die het kan beantwoorden.', { kind: 'queue-routing', version: '2.0.1', latestVersion: '2.1.0', installed: true, updateAvailable: true }),
	card('pos', 'Kassa-inrichting voor de winkel', 'Kassa-inrichting', 'Conduction', 'Betaalwijzen, retourredenen, kassarollen en een bonsjabloon.', { kind: 'pos-setup', version: '1.1.0' }),
	card('woo', 'Pipeline voor Woo-vragen', 'Pipelinesjabloon', 'Gemeente Lindewaard', 'Fases voor een Woo-vraag, van intake tot overdracht aan dossiq.', { kind: 'pipeline', version: '1.2.0' }),
	card('balie', 'Baliproducten en leges', 'Catalogus', 'Gemeente Lindewaard', 'Producten en diensten die aan de balie worden verkocht, met prijzen en btw-tarieven.', { kind: 'catalogue', version: '0.9.2' }),
	card('pas', 'Bewonerspas', 'Loyaliteitsprogramma', 'Gemeente Oosterwold', 'Punten voor bezoek aan bibliotheek, zwembad en sportpark, in drie niveaus.', { kind: 'loyalty-programme', installed: true, openUrl: '#pas' }),
	card('brevo', 'Bulkmail via Brevo', 'Connector', 'Conduction', 'Verstuurt mailings via Brevo, over een bron in integriq.', { kind: 'adapter', version: '1.4.0', installed: true, openUrl: '#brevo' }),
	card('asterisk', 'Asterisk-telefonie', 'Connector', 'Conduction', 'Schermmeldingen en klikken om te bellen via een Asterisk-centrale.', { kind: 'adapter', version: '2.6.1', latestVersion: '3.0.0', installed: true, updateAvailable: true }),
	card('berichtenbox', 'Berichtenbox', 'Connector', 'Conduction', 'Berichten naar de Berichtenbox van MijnOverheid van een inwoner, via Logius.', { kind: 'adapter' }),
]

test('the store page draws board PqStore under the board look', async ({ page }) => {
	await page.route('**/apps/pipelinq/api/store/items**', (route) => route.fulfill({
		contentType: 'application/json',
		body: JSON.stringify({ outcome: 'ok', cards: CARDS }),
	}))
	await page.setViewportSize({ width: 1440, height: 1400 })
	await page.goto('/?l7=store-board-look', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const host = page.locator('[data-testid="store-board-look"]')
	await host.locator('[data-testid="store-results"]').waitFor({ state: 'visible', timeout: 60_000 })

	if (process.env.L12_SHOT) {
		await host.screenshot({ path: process.env.L12_SHOT })
	}
	const chips = await host.locator('[data-testid="store-chips"] button').allInnerTexts()
	expect(chips.map((text) => text.replace(/\s+/g, ' ').trim())).toEqual(['All 9', 'Installed 5', 'Updates available 2', 'Connectors 3'])

	const style = (selector, props) => host.locator(selector).first().evaluate((el, names) => {
		const cs = getComputedStyle(el)
		return Object.fromEntries(names.map((n) => [n, cs[n]]))
	}, props)
	expect(await style('.cn-store-page__title', ['fontSize', 'fontWeight'])).toEqual({ fontSize: '28px', fontWeight: '700' })
	expect(await style('.cn-store-page__chip', ['height', 'borderTopLeftRadius'])).toEqual({ height: '36px', borderTopLeftRadius: '18px' })
	expect(await style('.cn-store-page__search-input', ['height'])).toEqual({ height: '40px' })
	expect(await style('.cn-store-page__card', ['paddingTop', 'borderTopLeftRadius'])).toEqual({ paddingTop: '18px', borderTopLeftRadius: '12px' })
	expect(await style('.cn-store-page__card-action--install', ['height', 'borderTopLeftRadius'])).toEqual({ height: '34px', borderTopLeftRadius: '17px' })

	// The search sits right of the chips, on the same row.
	const chipsBox = await host.locator('[data-testid="store-chips"]').boundingBox()
	const searchBox = await host.locator('.cn-store-page__search').boundingBox()
	expect(searchBox.x).toBeGreaterThan(chipsBox.x)
	expect(Math.abs(searchBox.y + searchBox.height / 2 - (chipsBox.y + chipsBox.height / 2))).toBeLessThan(4)

	// Three cards a row.
	const tops = await host.locator('[data-testid="store-results"] > li').evaluateAll((els) => els.slice(0, 3).map((el) => el.getBoundingClientRect().top))
	expect(Math.abs(tops[0] - tops[2])).toBeLessThan(1)

	const aside = await host.locator('[data-testid="store-aside"]').boundingBox()
	const main = await host.locator('.cn-store-page__main').boundingBox()
	expect(aside.width).toBeLessThanOrEqual(300)
	expect(aside.x).toBeGreaterThan(main.x + main.width)
	await expect(host.locator('[data-testid="store-aside-installed"] li')).toHaveCount(5)
	await expect(host.locator('[data-testid="store-updates-summary"]')).toHaveText('2 updates are ready. Een update bewaart je eigen wijzigingen aan fases en wachtrijen.')
	await expect(host.locator('[data-testid="store-footnote"]')).toBeVisible()

	await host.locator('[data-testid="store-chip-kind:adapter"]').click()
	await expect(host.locator('[data-testid="store-results"] > li')).toHaveCount(3)
})
