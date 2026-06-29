import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Modal from './Modal';
import { renderWithTheme } from '../test/utils';

describe('Modal', () => {
  it('renders nothing when closed', () => {
    const { container } = renderWithTheme(
      <Modal open={false} onClose={vi.fn()} title="Antraštė">
        body
      </Modal>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders title, children and footer when open', () => {
    renderWithTheme(
      <Modal open onClose={vi.fn()} title="Antraštė" footer={<button>Veiksmas</button>}>
        <p>Kūnas</p>
      </Modal>,
    );
    expect(screen.getByRole('dialog', { name: 'Antraštė' })).toBeInTheDocument();
    expect(screen.getByText('Kūnas')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Veiksmas' })).toBeInTheDocument();
  });

  it('closes on Escape key', async () => {
    const onClose = vi.fn();
    renderWithTheme(
      <Modal open onClose={onClose} title="X">
        body
      </Modal>,
    );
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('closes on backdrop click but NOT on panel click', async () => {
    const onClose = vi.fn();
    const { container } = renderWithTheme(
      <Modal open onClose={onClose} title="X">
        body
      </Modal>,
    );
    // Clicking the dialog panel must not bubble to the backdrop handler.
    await userEvent.click(screen.getByRole('dialog'));
    expect(onClose).not.toHaveBeenCalled();
    // Clicking the backdrop (outermost element) closes.
    await userEvent.click(container.firstChild as Element);
    expect(onClose).toHaveBeenCalledOnce();
  });
});
