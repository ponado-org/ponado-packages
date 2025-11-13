# @ponado/lt-utils

Lithuanian language utilities for TypeScript.

## Installation

```bash
pnpm add @ponado/lt-utils
```

## Usage

```typescript
import {
  declineName,
  declineFullName,
  getVerbalAmount,
  getLithuanianHolidays,
  isHoliday,
  isDayOff,
  sanitizeFilename,
  normalizeLithuanianLetters
} from '@ponado/lt-utils';

// Decline Lithuanian names
const declined = declineName('Jonas', 'kilmininkas');
const fullDeclined = declineFullName('Jonas Petraitis', 'kilmininkas');

// Convert number to Lithuanian words
const amount = getVerbalAmount(1234.56); // "tūkstantis du šimtai trisdešimt keturi eurai 56 ct"

// Lithuanian holidays
const holidays = getLithuanianHolidays(2024);
const isDayOffWork = isHoliday(new Date('2024-02-16')); // true (Lietuvos valstybės atkūrimo diena)
const isRestDay = isDayOff(new Date('2024-01-01')); // true

// String utilities
const safe = sanitizeFilename('file:name?.txt'); // "filename.txt"
const normalized = normalizeLithuanianLetters 'ąčęėįšųūž'); // "aceeisuouz"
```

## API

### Name Declension

#### `declineName(name, case)`

Decline a single Lithuanian name to the specified grammatical case.

Cases: `"vardininkas"`, `"kilmininkas"`, `"naudininkas"`, `"galininkas"`, `"inagininkas"`, `"vietininkas"`, `"šauksmininkas"`

#### `declineFullName(fullName, case)`

Decline a full name (first + last) to the specified case.

### Amount Stringification

#### `getVerbalAmount(amount)`

Convert a number to Lithuanian words for amounts.

- `1234.56` → `"tūkstantis du šimtai trisdešimt keturi eurai 56 ct"`

### Holidays

#### `getLithuanianHolidays(year)`

Get all Lithuanian holidays for a year.

#### `getFixedFeasts(year)`

Get fixed-date holidays.

#### `getMovableFeasts(year)`

Get movable holidays (Easter, etc.).

#### `getLiturgicalCalendar(year)`

Get the full liturgical calendar.

#### `getEasterDate(year)`

Calculate Easter Sunday date for a year.

#### `isHoliday(date)`

Check if a date is a Lithuanian holiday.

#### `isDayOff(date)`

Check if a date is a day off (holiday or weekend).

#### `isWeekend(date)`

Check if a date falls on a weekend.

#### `getHolidayName(date)`

Get the name of the holiday for a date (if any).

### String Utilities

#### `sanitizeFilename(filename)`

Remove invalid characters from a filename.

#### `normalizeLithuanianLetters(text)`

Convert Lithuanian letters to ASCII equivalents.

- `ąčęėįšųūž` → `aceeisuouz`

### Date Formatting

#### `getVerbalDate(date)`

Format a date in Lithuanian verbal format.

- `new Date('2024-05-09')` → `"2024 m. gegužės 9 d."`

#### `formatDaysDifference(days)`

Format a day difference as a Lithuanian phrase.
