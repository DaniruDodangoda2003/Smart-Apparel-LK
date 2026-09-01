/**
 * Utilities for loading fixed JSON demo data safely from the public directory.
 */

export const loadDemoJson = async (relativePath) => {
  try {
    const response = await fetch(`/demo-data/${relativePath}`);
    if (!response.ok) {
      throw new Error(`Failed to load ${relativePath}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error loading required demo data: ${relativePath}`, error);
    throw error;
  }
};

export const safeLoadDemoJson = async (relativePath, fallback = null) => {
  try {
    const response = await fetch(`/demo-data/${relativePath}`);
    if (!response.ok) {
      console.warn(`Optional demo data not found or failed to load: ${relativePath}. Using fallback.`);
      return fallback;
    }
    return await response.json();
  } catch (error) {
    console.warn(`Optional demo data failed to fetch: ${relativePath}. Using fallback.`);
    return fallback;
  }
};

export const loadMultipleDemoJson = async (paths) => {
  return Promise.all(paths.map(path => loadDemoJson(path)));
};
