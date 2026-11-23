## ADDED Requirements

### Requirement: the activity surface renders one merged feed

`CnActivityTab` SHALL read openregister's merged activity feed for the
object it is mounted on, and SHALL page on that feed's time cursor.

It SHALL NOT read the single-source Activity endpoint it read before. Five
sources with five offsets cannot be paged: rows appear twice or not at all
as soon as the sources are unequal, which is why the engine's cursor is a
time.

#### Scenario: four kinds in one list

- GIVEN an object whose history holds a field change, an attached file, a
  note and a linked mail
- WHEN the reader opens the activity surface
- THEN all four appear in one reverse chronological list
- AND each row names its actor, its time and its kind

---

### Requirement: a kind with no rows is still a chip

The surface SHALL render one filter chip per kind, carrying the count the
engine returns, and SHALL keep a chip whose count is zero.

A chip that disappears when it is empty says the kind does not exist on this
object. A chip reading zero says nothing happened of that kind. Those are
different sentences and the reader acts on them differently.

#### Scenario: an object with no notes

- GIVEN an object with file rows and no note rows
- WHEN the reader opens the surface
- THEN the notes chip renders with a count of 0
- AND is not removed from the filter bar

---

### Requirement: reads stay off, and the reader's choice is remembered

The surface SHALL exclude read entries by default, and SHALL remember per
user whether the reader turned them back on.

Fifteen of the seventeen rows on the measured case detail were reads. Only
an audit row can be a read, so a note whose action is spelled `read` is
still shown.

#### Scenario: the toggle survives a reload

- GIVEN a reader who turned reads on
- WHEN they reopen the surface later
- THEN reads are still shown

#### Scenario: a note is not a read

- GIVEN a note row whose action is spelled `read`
- WHEN reads are excluded
- THEN the note row is still shown

---

### Requirement: the export is what is on screen

The surface SHALL offer an export of the filtered feed, and that export
SHALL carry the rows and filters currently shown rather than re-querying.

An export that re-reads can disagree with the list beside it, and the reader
has no way to tell which of the two was wrong.

#### Scenario: a filtered export carries the filter

- GIVEN a reader who has narrowed the feed to file rows in the last 7 days
- WHEN they export
- THEN the export request carries those filters
- AND the file holds the rows the surface is showing

---

### Requirement: the feed is also a widget

The activity leaf SHALL register a widget surface alongside the tab, so a
manifest can place the merged feed on a grid.

A detail page that mounts it SHALL drop its separate audit and version tabs,
because one log in two places is the duplication the merged feed exists to
retire.

#### Scenario: a manifest places the feed on a grid

- GIVEN a detail page whose manifest declares the activity widget
- WHEN the page renders
- THEN the merged feed renders in the widget's cell
