/**
 * src/components/pagination.js
 *
 * Previous / page numbers / Next for the catalog, from the API's meta (page, totalPages).
 * Buttons, not links: the catalog state writes the page to the URL.
 */
import * as dom from '../utils/dom.js';

/**
 * One page button.
 * @param {string} text
 * @param {number} page target page
 * @param {{ current?: boolean, disabled?: boolean, label?: string }} options
 * @returns {HTMLLIElement}
 */
function pageButton(text, page, { current = false, disabled = false, label } = {}) {
  const button = dom.el('button', {
    className: `pagination__button${current ? ' pagination__button--current' : ''}`,
    text,
    attrs: {
      type: 'button',
      'aria-label': label,
      'aria-current': current ? 'page' : null,
      disabled: disabled ? '' : null,
    },
    dataset: { page },
  });
  return dom.el('li', { className: 'pagination__item' }, [button]);
}

/**
 * @param {HTMLElement} root the <nav> element
 * @param {{ onPage: (page: number) => void }} deps
 * @returns {{ render: (meta: { page: number, totalPages: number } | null) => void, unmount: () => void }}
 */
export function mount(root, { onPage }) {
  const list = dom.el('ul', { className: 'pagination__list' });
  root.appendChild(list);

  /** Delegate clicks from any page button. */
  function onClick(event) {
    const button = event.target.closest('button[data-page]');
    if (button && !button.disabled && button.getAttribute('aria-current') !== 'page') {
      onPage(Number(button.dataset.page));
    }
  }
  root.addEventListener('click', onClick);

  return {
    render(meta) {
      dom.clear(list);
      root.hidden = !meta || meta.totalPages <= 1;
      if (root.hidden) return;
      const { page, totalPages } = meta;
      list.appendChild(
        pageButton('Previous', page - 1, { disabled: page <= 1, label: 'Previous page' }),
      );
      for (let n = 1; n <= totalPages; n += 1) {
        list.appendChild(pageButton(String(n), n, { current: n === page, label: `Page ${n}` }));
      }
      list.appendChild(
        pageButton('Next', page + 1, { disabled: page >= totalPages, label: 'Next page' }),
      );
    },
    unmount: () => root.removeEventListener('click', onClick),
  };
}
