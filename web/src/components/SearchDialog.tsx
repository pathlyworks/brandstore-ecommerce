/**
 * The header's "Search" button and its dialog (on every page): type a product name, press Search, land on
 * /products?search=…. Built on Modal, so focus moves into the dialog, Tab and Shift+Tab stay inside it,
 * Escape closes it and focus returns to the Search button. The button says what it opens (aria-haspopup).
 */
import { useId, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { Button } from './Button';
import { Modal } from './Modal';

export function SearchDialog() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const inputId = useId();
  const navigate = useNavigate();

  function submit(event: FormEvent) {
    event.preventDefault();
    const query = text.trim();
    setOpen(false);
    void navigate(query ? `/products?search=${encodeURIComponent(query)}` : '/products');
  }

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        Search
      </Button>
      <Modal open={open} title="Search products" onClose={() => setOpen(false)}>
        <form role="search" onSubmit={submit} className="flex flex-col gap-sm">
          <label htmlFor={inputId} className="font-semibold text-text">
            Product name
          </label>
          <input
            id={inputId}
            type="search"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="min-h-(--size-tap-target) rounded-md border-2 border-border-control px-sm text-text focus-visible:outline-(length:--focus-ring-width) focus-visible:outline-primary focus-visible:outline-solid"
          />
          <div className="flex flex-wrap justify-end gap-sm">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Search</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
