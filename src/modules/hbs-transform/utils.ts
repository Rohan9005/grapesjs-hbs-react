// Utility functions for hbs-transform
import Handlebars, { SafeString } from 'handlebars';

/**
 * Escapes an expression value for safe HTML output
 */
export const escapeExpression = (value: unknown): string => 
  Handlebars.escapeExpression(value as string ?? '');

/**
 * Creates a token span element with Handlebars data attributes
 */
export const createTokenSpan = (path: string, value: unknown, className = 'hbs-token'): SafeString =>
  new Handlebars.SafeString(
    `<span data-hbs="{{${path}}}" class="${className}">${escapeExpression(value)}</span>`
  );

/**
 * Checks if a string is numeric
 */
export const isNumeric = (str: string): boolean => {
  return /^\d+$/.test(str);
};

/**
 * Cleans Handlebars expression by removing surrounding braces
 */
export const cleanHandlebarsExpression = (expression: string): string => {
  return expression.replace(/^\{\{|\}\}$/g, '');
};

/**
 * Converts numeric path patterns to 'this' for simple arrays
 */
export const convertNumericPathToThis = (expression: string): string => {
  // Handle simple array patterns like "simpleArray.0" -> "this"
  const parts = expression.split('.');
  if (parts.length === 2 && isNumeric(parts[1])) {
    return 'this';
  }
  return expression;
};
