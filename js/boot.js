/*
 * boot.js — runs in <head>, before first paint.
 * Marks the document as "script available" so the stylesheets can apply the
 * collapsed mobile menu only when the script that opens it will also run.
 * It lives in its own file because the project keeps all code out of the HTML.
 */
document.documentElement.classList.add('js');
