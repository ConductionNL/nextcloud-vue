# Design: screens-chrome-parity

## One switch, not forty keys

The three Zuiddrecht rounds added an opt-in per difference: `content.ground`,
`config.headerCard`, `content.layout: "stacked"`, `breadcrumb.separator` and
about forty more. That was right while the screens were still moving. The
8 Oct canon fixes one setup per pattern, so an app that wants the screens
wants all of it, and forty keys per app would be forty chances to miss one.

Decision: one key, `look`, with two values.

- `"nextcloud"` (the default): today's rendering, untouched.
- `"board"`: the screens.

It is read at the manifest root and may be overridden per page with
`config.look`. `CnAppRoot` puts `cn-look-board` on its root element; a page
with its own `config.look` puts the class (or `cn-look-nextcloud`) on the
page root. Every board rule in the library is scoped under that class, so
an app that never sets it cannot be reached by one.

The earlier per-key opt-ins stay and keep working. Under `look: "board"` the
library turns on the ones the canon needs (for example `breadcrumb.separator:
"/"`, `showWidgetActions: false` in the side column) as defaults, and an
explicit key in the manifest still wins.

## Colours stay Nextcloud variables

The repo rule is Nextcloud CSS variables only for colour. The board hex
values are not written into the library. The spec names the variable and
gives the board value in brackets, so a reviewer can check what thematiq's
Zuiddrecht theme has to supply:

| Board value | Variable |
|---|---|
| `#1b1c1d` ink | `--color-main-text` |
| `#5e6168` muted | `--color-text-maxcontrast` |
| `#3d4047` secondary text | `--cn-board-text-soft`, default `--color-main-text` |
| `#c4c7cb` control outline | `--color-border-dark` |
| `#e4e6ea` card line, count badge | `--color-border` |
| `#eef0f3` hairline inside a card | `--cn-board-hairline`, default `--color-border` |
| `#eceef1` track, idle tab | `--color-background-dark` |
| `#f5f6f8` page ground | `--color-background-hover` |
| `#3669a5` primary | `--color-primary-element` |
| `#eaf0f7` / `#234a78` tonal primary | `--color-primary-element-light` / `--color-primary-element-light-text` |

Two `--cn-board-*` variables are new because Nextcloud has no matching token;
both default to an existing Nextcloud variable, so the board look renders
sensibly without thematiq.

The buildiq orange is the one brand exception already on record (ADR-041).
It moves from a literal to `--cn-buildiq-color` with today's `#f36c21` as the
default; the Zuiddrecht theme sets `#e2611a`.

## Dimensions are tokens

Sizes go into `src/css/look-board.css` as `--cn-board-*` custom properties on
`.cn-look-board` (content padding, content width, control height, control
radius, card radius, card padding). A theme can move them; the components
read the property, not the number.

## Settings save placement

The canon allows two placements and forbids both at once. Rather than infer
the placement from the fields, the page declares it: `config.saveMode` is
`"section"` or `"page"`. Without the key the page keeps today's save bar
under the last section. `pipelinq/PqBeheer` draws the section save at the
bottom left of its card while canon section 9 says bottom right; the spec
follows the canon and the board is listed as a board to correct.

## Risks

- A component that a consumer already restyles with `:deep()` may collide
  with a board rule. Board rules use the `.cn-look-board` prefix plus the
  component class (specificity 0,2,0), the same weight the earlier rounds
  used against thematiq's `!important` sheet only where a test proves it is
  needed.
- `NcAppNavigation` sets its own width (300px today). The board width is
  264px. The implementation must find whether the installed `@nextcloud/vue`
  takes the width from a custom property or needs a scoped override; the e2e
  asserts the rendered width so a difference is seen, not assumed.
