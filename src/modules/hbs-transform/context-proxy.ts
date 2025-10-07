// Context proxy functionality for lazy evaluation
import { createTokenSpan } from './utils';

/**
 * Builds a child path from base path, target object, and property
 */
function buildChildPath(basePath: string, target: any, prop: PropertyKey): string {
  if (Array.isArray(target)) {
    return basePath ? `${basePath}.${String(prop)}` : String(prop);
  }
  return (basePath ? `${basePath}.` : '') + String(prop);
}

/**
 * Creates a proxy factory for object properties
 */
function createProxyFactory(path: string, target: any) {
  return {
    get(_: any, prop: PropertyKey) {
      if (prop === '__hbs_path') return path;
      
      // Don't wrap array length property
      if (Array.isArray(target) && prop === 'length') {
        return target.length;
      }
      
      const rawValue = (target as any)[prop as any];
      const childPath = buildChildPath(path, target, prop);

      if (rawValue != null && typeof rawValue === 'object') {
        return new Proxy(rawValue, createProxyFactory(childPath, rawValue));
      }
      
      return createTokenSpan(childPath, rawValue);
    },
    ownKeys: () => Reflect.ownKeys(target),
    getOwnPropertyDescriptor: (_: any, p: PropertyKey) =>
      Object.getOwnPropertyDescriptor(target, p) || { configurable: true, enumerable: true }
  };
}

/**
 * Creates a context proxy for lazy evaluation of object properties
 */
export function createContextProxy(obj: any, basePath = ''): any {
  if (obj == null || typeof obj !== 'object') {
    return createTokenSpan(basePath, obj);
  }

  return new Proxy(obj, createProxyFactory(basePath, obj));
}
