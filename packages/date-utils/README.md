# @ponado/date-utils

Date utilities for TypeScript with Lithuanian localization support.

## Installation

```bash
pnpm add @ponado/date-utils
```

## Usage

```typescript
import {
	calculateAge,
	getVerbalDate,
	getDifferenceInDays,
	getDaysUntilAnniversary,
	formatDaysDifference
} from '@ponado/date-utils';

// Calculate age
const age = calculateAge(new Date('1990-05-15'));

// Format date in Lithuanian
const verbal = getVerbalDate(new Date()); // "2024 m. gegužės 9 d."

// Days between dates
const days = getDifferenceInDays(date1, date2);

// Days until next birthday
const daysUntil = getDaysUntilAnniversary(birthDate);

// Human-readable difference
const text = formatDaysDifference(5); // "5 d."
const text = formatDaysDifference(0); // "šiandien"
const text = formatDaysDifference(-1); // "vakar"
```

## API

### `calculateAge(birthDate, today?)`

Calculate age in full years.

### `getVerbalDate(date)`

Format date as "YYYY m. MonthName DD d." in Lithuanian.

### `getDifferenceInDays(date1, date2)`

Calculate absolute difference in days between two dates.

### `getDaysUntilAnniversary(date, now?)`

Get days until the next occurrence of a date (e.g., birthday).

### `formatDaysDifference(diffDays)`

Convert day difference to human-readable Lithuanian string.

- `-1` → `"vakar"` (yesterday)
- `0` → `"šiandien"` (today)
- `1` → `"rytoj"` (tomorrow)
- `< 30` → `"N d."` (N days)
- `< 365` → `"N mėn."` (N months)
- `>= 365` → `"N m."` (N years)

### `getAnniversaryDate(eventDate, now?)`

Get the next anniversary date.

### `getYearsOnAnniversary(anniversaryDate, now?)`

Get number of years that will be celebrated on next anniversary.

### `normalizeToUTC(date)`

Normalize a Date to midnight UTC.
