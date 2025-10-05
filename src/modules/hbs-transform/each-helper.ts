// Custom Handlebars each helper implementation
import Handlebars from 'handlebars';

/**
 * Extracts the array path from the root context
 */
function extractArrayPath(array: any[], options: any): string {
  if (!options?.data?.root) {
    return '';
  }

  const root = options.data.root;
  
  // Check common array properties
  const commonPaths = ['items', 'simpleArray', 'data', 'list'];
  
  for (const path of commonPaths) {
    if (Array.isArray(root[path]) && 
        JSON.stringify(array) === JSON.stringify(root[path])) {
      return path;
    }
  }
  
  return '';
}

/**
 * Renders each item in the array using the template
 */
function renderEachItems(array: any[], options: any): string {
  let content = '';
  
  for (let i = 0; i < array.length; i++) {
    content += options.fn(array[i]);
  }
  
  return content;
}

/**
 * Registers the custom each helper with Handlebars
 */
export function registerCustomEachHelper(): void {
  Handlebars.unregisterHelper('each');
  
  Handlebars.registerHelper('each', function (this: any, context: any, options: any) {
    const array = context || [];
    
    if (!Array.isArray(array)) {
      return '';
    }

    const path = extractArrayPath(array, options);
    const innerContent = renderEachItems(array, options);
    const range = `0-${Math.max(0, array.length - 1)}`;

    return new Handlebars.SafeString(
      `<div data-hbs-each="${path}" data-hbs-range="${range}">${innerContent}</div>`
    );
  });
}
