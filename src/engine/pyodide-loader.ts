/**
 * Pyodide Loader
 * Handles initialization and management of Pyodide runtime
 */

import { PyodideInterface } from '../types/pile-types';

let pyodideInstance: PyodideInterface | null = null;
let loadingPromise: Promise<PyodideInterface> | null = null;

/**
 * Load Pyodide runtime and required packages
 * @param onProgress - Optional callback for loading progress
 * @returns Promise resolving to Pyodide instance
 */
export async function loadPyodide(
  onProgress?: (progress: number, message: string) => void
): Promise<PyodideInterface> {
  // Return existing instance if already loaded
  if (pyodideInstance) {
    return pyodideInstance;
  }

  // Return existing loading promise if currently loading
  if (loadingPromise) {
    return loadingPromise;
  }

  // Start loading
  loadingPromise = (async () => {
    try {
      onProgress?.(10, 'Loading Pyodide runtime...');

      // Load Pyodide from CDN
      // @ts-ignore - loadPyodide is loaded from CDN script
      const pyodide = await globalThis.loadPyodide({
        indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/',
      });

      onProgress?.(40, 'Loading NumPy...');
      await pyodide.loadPackage('numpy');

      onProgress?.(70, 'Loading SciPy...');
      await pyodide.loadPackage('scipy');

      onProgress?.(90, 'Initializing solver...');

      // Load Python solver modules (will be created next)
      // For now, just initialize a simple test
      await pyodide.runPythonAsync(`
import numpy as np
from scipy import sparse
print("Pyodide environment ready!")
      `);

      onProgress?.(100, 'Ready!');

      pyodideInstance = pyodide;
      return pyodide;
    } catch (error) {
      loadingPromise = null;
      throw new Error(`Failed to load Pyodide: ${error}`);
    }
  })();

  return loadingPromise;
}

/**
 * Get the current Pyodide instance (must be loaded first)
 */
export function getPyodide(): PyodideInterface {
  if (!pyodideInstance) {
    throw new Error('Pyodide not loaded. Call loadPyodide() first.');
  }
  return pyodideInstance;
}

/**
 * Check if Pyodide is ready
 */
export function isPyodideReady(): boolean {
  return pyodideInstance !== null;
}

/**
 * Run Python code in Pyodide
 * @param code - Python code to execute
 * @returns Result of Python execution
 */
export async function runPython(code: string): Promise<any> {
  const pyodide = getPyodide();
  return await pyodide.runPythonAsync(code);
}

/**
 * Load Python module code into Pyodide
 * @param moduleName - Name of the module
 * @param code - Python source code
 */
export async function loadPythonModule(moduleName: string, code: string): Promise<void> {
  const pyodide = getPyodide();

  // Write the module to Pyodide's virtual filesystem
  pyodide.FS.writeFile(`${moduleName}.py`, code);

  // Import the module
  await pyodide.runPythonAsync(`import ${moduleName}`);
}

/**
 * Convert JavaScript object to Python dict
 * @param obj - JavaScript object
 * @returns Python dict proxy
 */
export function jsToPython(obj: any): any {
  const pyodide = getPyodide();
  return pyodide.toPy(obj);
}

/**
 * Convert Python object to JavaScript
 * @param pyObj - Python object
 * @returns JavaScript object
 */
export function pythonToJs(pyObj: any): any {
  // Pyodide automatically converts simple types
  // For complex types, may need toJs() method
  if (pyObj && typeof pyObj.toJs === 'function') {
    return pyObj.toJs();
  }
  return pyObj;
}
