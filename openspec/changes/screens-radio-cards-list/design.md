# Design: screens-radio-cards-list

The list keeps the widget's markup (a label per option around a real radio input, the drawn dot, the title and the
description), so choosing, saving, the keyboard and the accessibility tree stay as they are. Only the styling changes
under `cn-radio-cards--list`: no padding, border, background or shadow on an option, an 18px dot, a 15px regular label,
a 13px description, 8px between options. A list is one column whatever `columns` says.
