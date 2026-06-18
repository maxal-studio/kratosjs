---
title: Rich Editor
---

# Rich Editor

The rich editor field provides a WYSIWYG editor with formatting toolbar.

## Basic Usage

```typescript
import { RichEditor } from '@maxal_studio/kratosjs';

RichEditor.make('content');
```

## Toolbar Buttons

Customize toolbar buttons:

```typescript
RichEditor.make('content').toolbarButtons(['bold', 'italic', 'underline', 'link']);
```

Available buttons: `bold`, `italic`, `underline`, `strike`, `code`, `h1`, `h2`, `h3`, `bulletList`, `orderedList`, `blockquote`, `codeBlock`, `link`, `audio`, `image`, `video`, `embed`, `subscript`, `superscript`, `highlight`, `alignLeft`, `alignCenter`, `alignRight`, `undo`, `redo`, `htmlSource`

## Disable Toolbar Buttons

Disable specific toolbar buttons:

```typescript
RichEditor.make('content').disableToolbarButtons(['video', 'embed']);
```

## File Attachments

Allow file attachments:

```typescript
RichEditor.make('content').fileAttachments();
```

## Embeds

Allow embeds (YouTube, etc.):

```typescript
RichEditor.make('content').embeds();
```

## HTML Source

Allow users to edit HTML source:

```typescript
RichEditor.make('content').htmlSource();
```

## Extensions

Enable additional TipTap extensions:

```typescript
RichEditor.make('content').extensions(['link', 'subscript', 'superscript']);
```

## Placeholder

```typescript
RichEditor.make('content').placeholder('Enter content...');
```

## Length Validation

```typescript
RichEditor.make('content').minLength(10).maxLength(5000);
```

## Label

```typescript
RichEditor.make('content').label('Content');
```

## Default Value

```typescript
RichEditor.make('content').default('<p>Default content</p>');
```

## Required

```typescript
RichEditor.make('content').required();
```

## Helper Text

```typescript
RichEditor.make('content').helperText('Enter rich text content');
```

## Hints

```typescript
RichEditor.make('content').hint('Use the toolbar to format text').hintIcon('Edit');
```

## Complete Example

```typescript
RichEditor.make('content')
	.label('Content')
	.toolbarButtons(['bold', 'italic', 'underline', 'link', 'image'])
	.fileAttachments()
	.embeds()
	.placeholder('Enter content...')
	.minLength(10)
	.maxLength(5000)
	.required()
	.hint('Use the toolbar to format text')
	.hintIcon('Edit');
```
