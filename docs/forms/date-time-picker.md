---
title: Date Time Picker
---

# Date Time Picker

The date-time picker field allows you to select dates and times.

## Basic Usage

```typescript
import { DateTimePicker } from '@maxal_studio/kratosjs';

// Date only
DateTimePicker.make('publishedAt').label('Published Date').format('YYYY-MM-DD');

// Time only
DateTimePicker.make('startTime').label('Start Time').format('HH:mm');

// Date and time
DateTimePicker.make('eventDateTime').label('Event Date & Time').format('YYYY-MM-DD HH:mm:ss');
```

## Format

The component automatically detects whether to show a date, time, or datetime picker based on the format string:

### Date Only Formats

```typescript
DateTimePicker.make('date').format('YYYY-MM-DD'); // 2024-03-15
DateTimePicker.make('date').format('DD/MM/YYYY'); // 15/03/2024
DateTimePicker.make('date').format('MM-DD-YYYY'); // 03-15-2024
```

### Time Only Formats

```typescript
DateTimePicker.make('time').format('HH:mm'); // 14:30 (24-hour)
DateTimePicker.make('time').format('HH:mm:ss'); // 14:30:45 (with seconds)
DateTimePicker.make('time').format('h:mm A'); // 2:30 PM (12-hour)
```

**Note:** Time-only format is detected when the format contains `HH:mm` or `h:m` but does NOT contain date components like `YYYY`, `DD`, or `MM/`.

### DateTime Formats

```typescript
DateTimePicker.make('datetime').format('YYYY-MM-DD HH:mm'); // 2024-03-15 14:30
DateTimePicker.make('datetime').format('DD/MM/YYYY HH:mm:ss'); // 15/03/2024 14:30:45
DateTimePicker.make('datetime').format('YYYY-MM-DD h:mm A'); // 2024-03-15 2:30 PM
```

## Display Format

Set the display format (different from stored format):

```typescript
DateTimePicker.make('publishedAt').format('YYYY-MM-DD').displayFormat('MM/DD/YYYY');
```

## Timezone

Set the timezone:

```typescript
DateTimePicker.make('publishedAt').timezone('America/New_York');
```

## Native Picker

Use the browser's native date picker:

```typescript
DateTimePicker.make('publishedAt').native();
```

## Min Date

Set the minimum selectable date:

```typescript
DateTimePicker.make('publishedAt').minDate(new Date());
```

## Max Date

Set the maximum selectable date:

```typescript
DateTimePicker.make('publishedAt').maxDate('2024-12-31');
```

## First Day of Week

Set the first day of the week (0 = Sunday, 1 = Monday, etc.):

```typescript
DateTimePicker.make('publishedAt').firstDayOfWeek(1);
```

## Label

```typescript
DateTimePicker.make('publishedAt').label('Published At');
```

## Default Value

```typescript
DateTimePicker.make('publishedAt').default(new Date());
```

## Required

```typescript
DateTimePicker.make('publishedAt').required();
```

## Helper Text

```typescript
DateTimePicker.make('publishedAt').helperText('Select publication date');
```

## Hints

```typescript
DateTimePicker.make('publishedAt').hint('Choose a date').hintIcon('Calendar');
```

## Complete Examples

### Date Picker

```typescript
DateTimePicker.make('publishedAt')
	.label('Published At')
	.format('YYYY-MM-DD')
	.displayFormat('MM/DD/YYYY')
	.minDate(new Date())
	.firstDayOfWeek(1)
	.required()
	.hint('Select publication date')
	.hintIcon('Calendar');
```

### Time Picker (Business Hours)

```typescript
DateTimePicker.make('openingTime')
	.label('Opening Time')
	.format('HH:mm')
	.displayFormat('h:mm A') // Display as "9:00 AM"
	.required()
	.helperText('Store opening time');

DateTimePicker.make('closingTime')
	.label('Closing Time')
	.format('HH:mm')
	.displayFormat('h:mm A') // Display as "5:00 PM"
	.required()
	.helperText('Store closing time');
```

### DateTime Picker (Event Scheduler)

```typescript
DateTimePicker.make('eventDateTime')
	.label('Event Date & Time')
	.format('YYYY-MM-DD HH:mm')
	.displayFormat('MMM DD, YYYY at h:mm A') // Display as "Mar 15, 2024 at 2:30 PM"
	.minDate(new Date()) // Can't schedule in the past
	.required()
	.helperText('Select when the event will take place');
```
