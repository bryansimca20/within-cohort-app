import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { InstallCard } from '@/components/InstallCard';

const DISMISS_KEY = 'within-install-dismissed';

function mockMatchMedia(matches: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

beforeEach(() => {
  window.localStorage.clear();
  mockMatchMedia(false);
});

afterEach(() => {
  cleanup();
});

test('shows the install prompt when not standalone and not dismissed', () => {
  render(<InstallCard />);
  expect(screen.getByText('Share')).toBeInTheDocument();
  expect(screen.getByText('Add to Home Screen')).toBeInTheDocument();
});

test('renders nothing when the display mode is already standalone', () => {
  mockMatchMedia(true);
  const { container } = render(<InstallCard />);
  expect(container).toBeEmptyDOMElement();
});

test('renders nothing when navigator.standalone is true (iOS)', () => {
  Object.defineProperty(window.navigator, 'standalone', { value: true, configurable: true });
  const { container } = render(<InstallCard />);
  expect(container).toBeEmptyDOMElement();
  Object.defineProperty(window.navigator, 'standalone', { value: undefined, configurable: true });
});

test('dismissing hides the card and persists the dismissal', () => {
  render(<InstallCard />);
  fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));
  expect(screen.queryByText('Add to Home Screen')).not.toBeInTheDocument();
  expect(window.localStorage.getItem(DISMISS_KEY)).toBe('1');
});

test('stays hidden on a fresh render once dismissal was already persisted', () => {
  window.localStorage.setItem(DISMISS_KEY, '1');
  const { container } = render(<InstallCard />);
  expect(container).toBeEmptyDOMElement();
});
