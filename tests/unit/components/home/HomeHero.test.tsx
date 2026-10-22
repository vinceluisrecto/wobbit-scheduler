import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HomeHero } from '@/components/home';

describe('HomeHero', () => {
  it('renders the headline', () => {
    render(<HomeHero />);

    expect(
      screen.getByRole('heading', { level: 1, name: /plan, track, and ship your work/i }),
    ).toBeInTheDocument();
  });

  it('links the call-to-action buttons to their sections', () => {
    render(<HomeHero />);

    expect(screen.getByRole('link', { name: 'Get started' })).toHaveAttribute(
      'href',
      '#get-started',
    );
    expect(screen.getByRole('link', { name: 'See features' })).toHaveAttribute('href', '#features');
  });
});
