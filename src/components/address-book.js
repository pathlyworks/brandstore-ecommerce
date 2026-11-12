/**
 * src/components/address-book.js
 *
 * Saved addresses on account.html: each can be edited in place (street and city; PUT
 * /account/addresses/{id}) or deleted (DELETE). The edit form validates the city (required) with the
 * same accessible errors as the other forms.
 */
import * as dom from '../utils/dom.js';
import { validateAddress } from '../utils/validate.js';
import { readFields, showErrors } from './form-errors.js';

/**
 * A labelled text field with an error slot.
 * @param {string} id
 * @param {string} name
 * @param {string} label
 * @param {string} value
 * @returns {HTMLElement}
 */
function field(id, name, label, value) {
  return dom.el('div', { className: 'field' }, [
    dom.el('label', { className: 'field__label', text: label, attrs: { for: id } }),
    dom.el('input', {
      className: 'field__input',
      attrs: {
        id,
        name,
        value,
        autocomplete: name === 'city' ? 'address-level2' : 'street-address',
        'aria-describedby': `${id}-error`,
      },
    }),
    dom.el('p', { className: 'field__error', attrs: { id: `${id}-error` } }),
  ]);
}

/**
 * Validate and save the edit form (errors shown in the form).
 * @param {SubmitEvent} event
 * @param {HTMLFormElement} form
 * @param {HTMLButtonElement} save
 * @param {object} address
 * @param {(address: object) => Promise<void>} onSave
 */
async function submitEdit(event, form, save, address, onSave) {
  event.preventDefault();
  const values = readFields(form, ['street', 'city']);
  const errors = validateAddress(values);
  if (errors.length) return showErrors(form, errors);
  save.disabled = true;
  await onSave({ ...address, street: values.street.trim(), city: values.city.trim() }).catch(
    (error) => showErrors(form, [], error.message),
  );
  save.disabled = false;
}

/**
 * The inline edit form for one address.
 * @param {object} address
 * @param {{ onSave: (address: object) => Promise<void>, onClose: () => void }} actions
 * @returns {HTMLFormElement}
 */
function editForm(address, { onSave, onClose }) {
  const id = `addr-${address.id}`;
  const save = dom.el('button', {
    className: 'btn btn--secondary',
    text: 'Save address',
    attrs: { type: 'submit' },
  });
  const cancel = dom.el('button', {
    className: 'link-button',
    text: 'Cancel',
    attrs: { type: 'button' },
  });
  const form = dom.el(
    'form',
    {
      className: 'address-form',
      attrs: { novalidate: '', 'aria-label': `Edit address ${address.id}` },
    },
    [
      dom.el('div', {
        className: 'form-summary',
        attrs: { role: 'alert', tabindex: '-1', hidden: '' },
      }),
      field(`${id}-street`, 'street', 'Street', address.street),
      field(`${id}-city`, 'city', 'City (required)', address.city),
      dom.el('div', { className: 'address-form__actions' }, [save, cancel]),
    ],
  );
  cancel.addEventListener('click', onClose);
  form.addEventListener('submit', (event) => submitEdit(event, form, save, address, onSave));
  return form;
}

/**
 * One address with Edit and Delete.
 * @param {object} address
 * @param {{ onEdit: (address: object) => void, onDelete: (address: object) => void }} actions
 * @returns {HTMLLIElement}
 */
function addressItem(address, { onEdit, onDelete }) {
  const label = [address.street, address.city].filter(Boolean).join(', ');
  const edit = dom.el('button', {
    className: 'link-button',
    text: 'Edit',
    attrs: { type: 'button', 'aria-label': `Edit address: ${label}` },
    dataset: { focusKey: `edit-${address.id}` },
  });
  const remove = dom.el('button', {
    className: 'link-button',
    text: 'Delete',
    attrs: { type: 'button', 'aria-label': `Delete address: ${label}` },
  });
  edit.addEventListener('click', () => onEdit(address));
  remove.addEventListener('click', () => onDelete(address));
  return dom.el('li', { className: 'address', dataset: { id: address.id } }, [
    dom.el('p', { className: 'address__text', text: label || '(no details)' }),
    dom.el('div', { className: 'cart-line__actions' }, [edit, remove]),
  ]);
}

/**
 * Render the list; the address being edited shows its form instead.
 * @param {HTMLUListElement} list
 * @param {object[]} addresses
 * @param {{ editingId: string | null, onEdit: Function, onDelete: Function, onSave: Function, onClose: Function }} ctx
 */
export function renderAddresses(list, addresses, ctx) {
  dom.clear(list);
  if (!addresses.length)
    list.appendChild(dom.el('li', { className: 'address', text: 'No saved addresses.' }));
  addresses.forEach((address) => {
    if (address.id !== ctx.editingId) return list.appendChild(addressItem(address, ctx));
    const form = editForm(address, ctx);
    list.appendChild(
      dom.el('li', { className: 'address address--editing', dataset: { id: address.id } }, [form]),
    );
    dom.qs('input', form).focus();
  });
}
