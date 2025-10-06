// Custom Handlebars each helper implementation
import Handlebars from 'handlebars';

/**
 * Extracts the array path from the root context
 */
function extractArrayPath(array: any[], options: any): string {
  // Check if we have parent path from outer each loop
  const parentPath = options?.data?.parentPath || '';
  const parentIndex = options?.data?.parentIndex;
  
  if (!options?.data?.root) {
    return '';
  }

  const root = options.data.root;

  // If we're in a nested context, search within the parent object
  if (parentPath && parentIndex !== undefined) {
    const parentObj = getNestedValue(root, parentPath, parentIndex);
    
    if (parentObj && typeof parentObj === 'object') {
      // Search for the array in the parent object
      for (const key of Object.keys(parentObj)) {
        if (Array.isArray(parentObj[key]) && 
            JSON.stringify(array) === JSON.stringify(parentObj[key])) {
          return `${parentPath}.${parentIndex}.${key}`;
        }
      }
    }
  }

  // Check common array properties at root level
  const commonPaths = ['items', 'simpleArray', 'data', 'list', 'categories'];
  
  for (const path of commonPaths) {
    if (Array.isArray(root[path]) &&
        JSON.stringify(array) === JSON.stringify(root[path])) {
      return path;
    }
  }

  return '';
}

/**
 * Gets a nested value from an object using path and index
 */
function getNestedValue(obj: any, path: string, index: number): any {
  const parts = path.split('.');
  let current = obj;
  
  for (const part of parts) {
    if (current == null) return null;
    current = current[part];
  }
  
  return Array.isArray(current) ? current[index] : null;
}

/**
 * Renders each item in the array using the template
 */
function renderEachItems(array: any[], options: any, arrayPath: string): string {
  let content = '';
  
  for (let i = 0; i < array.length; i++) {
    // Create new data context for nested loops
    const data = Handlebars.createFrame(options.data || {});
    data.index = i;
    data.parentPath = arrayPath;
    data.parentIndex = i;
    
    content += options.fn(array[i], { data });
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
    const innerContent = renderEachItems(array, options, path);
    const range = `0-${Math.max(0, array.length - 1)}`;
    
    return new Handlebars.SafeString(
      `<div data-hbs-each="${path}" data-hbs-range="${range}">${innerContent}</div>`
    );
  });
}