/**
 * src/components/gallery.js
 *
 * Product image gallery: one large image and a row of thumbnail buttons. The pressed thumbnail
 * (aria-pressed="true") is the one shown; Left/Right arrow keys move between thumbnails.
 */
import * as dom from '../utils/dom.js';

/**
 * One thumbnail button.
 * @param {{ url: string, alt: string }} image
 * @param {number} index
 * @param {number} count
 * @returns {HTMLButtonElement}
 */
function thumb(image, index, count) {
  return dom.el(
    'button',
    {
      className: 'gallery__thumb',
      attrs: {
        type: 'button',
        'aria-label': `Show image ${index + 1} of ${count}: ${image.alt}`,
        'aria-pressed': String(index === 0),
      },
      dataset: { index },
    },
    [dom.el('img', { attrs: { src: image.url, alt: '', width: 80, height: 60 } })],
  );
}

/**
 * @param {{ url: string, alt: string }[]} images first = main image
 * @returns {HTMLElement}
 */
export function createGallery(images) {
  const main = dom.el('img', {
    className: 'gallery__main',
    attrs: { src: images[0].url, alt: images[0].alt, width: 400, height: 300 },
  });
  const thumbs = images.map((image, i) => thumb(image, i, images.length));

  /** Show image i and move the pressed state (and focus, when asked). */
  function show(i, focus = false) {
    const index = (i + images.length) % images.length;
    main.src = images[index].url;
    main.alt = images[index].alt;
    thumbs.forEach((t, n) => t.setAttribute('aria-pressed', String(n === index)));
    if (focus) thumbs[index].focus();
  }

  thumbs.forEach((t, i) => {
    t.addEventListener('click', () => show(i));
    t.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowRight') show(i + 1, true);
      if (event.key === 'ArrowLeft') show(i - 1, true);
    });
  });
  const list = dom.el(
    'div',
    { className: 'gallery__thumbs', attrs: { role: 'group', 'aria-label': 'Product images' } },
    thumbs,
  );
  return dom.el('div', { className: 'gallery' }, [main, images.length > 1 ? list : '']);
}
