# HBS Transform Module

This module provides functionality for transforming Handlebars templates to annotated HTML and vice versa. It has been refactored into smaller, focused modules for better maintainability.

## Structure

### Core Files
- **`index.ts`** - Main module that exports all functionality and provides the public API
- **`types.ts`** - TypeScript type definitions for the module

### Utility Modules
- **`utils.ts`** - Basic utility functions for escaping expressions, creating token spans, and string manipulation
- **`context-proxy.ts`** - Context wrapping with proxy for lazy evaluation of object properties

### Handlebars Integration
- **`each-helper.ts`** - Custom Handlebars each helper implementation for generating annotated HTML

### HTML Processing
- **`html-parser.ts`** - Functions for parsing HTML and extracting each blocks
- **`template-extractor.ts`** - Utilities for extracting templates from each block content
- **`span-converter.ts`** - Functions for converting spans to mustache expressions
- **`html-processor.ts`** - Main HTML processing functionality combining regex and DOM operations
- **`template-processor.ts`** - High-level template transformation functions

## Usage

```typescript
import { hbsToAnnotatedHtml, annotatedHtmlToHbs } from './hbs-transform';

// Convert Handlebars template to annotated HTML
const html = hbsToAnnotatedHtml('{{#each items}}{{name}}{{/each}}', { items: [...] });

// Convert annotated HTML back to Handlebars template
const template = annotatedHtmlToHbs(html);
```

## API

### Main Functions
- `hbsToAnnotatedHtml(hbsTemplate: string, data: unknown): string` - Converts Handlebars template to annotated HTML
- `annotatedHtmlToHbs(html: string): string` - Converts annotated HTML back to Handlebars template

### Utility Functions
- `escapeExpression(value: unknown): string` - Escapes values for safe HTML output
- `createTokenSpan(path: string, value: unknown, className?: string): SafeString` - Creates token spans
- `isNumeric(str: string): boolean` - Checks if string is numeric
- `cleanHandlebarsExpression(expression: string): string` - Removes surrounding braces
- `convertNumericPathToThis(expression: string): string` - Converts numeric paths to 'this'

### Context Proxy
- `createContextProxy(obj: any, basePath?: string): any` - Creates a proxy for lazy evaluation

### Each Helper
- `registerCustomEachHelper(): void` - Registers the custom each helper with Handlebars
