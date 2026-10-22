# A board bar list stands its rows 27px apart

## Why

DqDashboard draws a chart card's bar list ("Zaken per status") with 14px rows
and 10px between them, so the rows stand 27px apart. Live, each row is a drill
button. It took Nextcloud's 3px button margin and the page's 15px text at line
height 1.5, which put the rows 38px apart.

## What changes

In the board look a bar row drops the button margin and is set at 14px with
the normal line height. Checked on :8080 by injecting the rule: the rows went
from 38.5px to 27px apart.

The chart card's own height (296px live against 251px on the board) comes from
the dashboard layout's grid height, not from its content. That part is the
host app's layout config (`sizeToContent` or a smaller `gridHeight`).
