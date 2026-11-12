/** src/pages/not-found.js — entry module for 404.html. */
import { start } from '../main.js';
import { init as nav } from '../components/nav.js';
import { init as scrollRegions } from '../components/scroll-regions.js';

start([
  ['nav', nav],
  ['scroll-regions', scrollRegions],
]);
