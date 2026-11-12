/*
 * main.js — entry point. Loaded last, so every feature file has already
 * registered itself; this just starts them. Scripts are loaded with `defer`,
 * which guarantees the DOM is fully parsed before this line runs.
 */
BrandStore.start();
