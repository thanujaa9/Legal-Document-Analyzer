import { render, screen } from '@testing-library/react';
import App from './App';

test('unauthenticated visitors see the original login with demo credentials', async () => {
  window.history.pushState({}, '', '/');
  render(<App />);
  expect(await screen.findByText('Sign in to your account')).toBeInTheDocument();
  expect(screen.getByDisplayValue('xyz@gmail.com')).toBeInTheDocument();
  expect(screen.getByDisplayValue('123456')).toBeInTheDocument();
});
