import { render } from '@testing-library/react';
import { SessionTypeField } from '@/components/SessionTypeField';

test('submits the default session type ("easy") under sessionType via FormData', () => {
  const { container } = render(
    <form>
      <SessionTypeField />
    </form>
  );
  const form = container.querySelector('form')!;
  expect(new FormData(form).get('sessionType')).toBe('easy');
});

test('submits a non-default enum value raw, not a formatted label', () => {
  const { container } = render(
    <form>
      <SessionTypeField defaultValue="tempo" />
    </form>
  );
  const form = container.querySelector('form')!;
  expect(new FormData(form).get('sessionType')).toBe('tempo');
});

test('does not render the "other" text field for the default type', () => {
  const { queryByText } = render(
    <form>
      <SessionTypeField />
    </form>
  );
  expect(queryByText('Describe the session')).not.toBeInTheDocument();
});

test('reveals and submits sessionTypeOther once the type is "other"', () => {
  const { container, getByText } = render(
    <form>
      <SessionTypeField defaultValue="other" defaultOtherValue="Hill repeats" />
    </form>
  );
  expect(getByText('Describe the session')).toBeInTheDocument();
  const form = container.querySelector('form')!;
  expect(new FormData(form).get('sessionType')).toBe('other');
  expect(new FormData(form).get('sessionTypeOther')).toBe('Hill repeats');
});
