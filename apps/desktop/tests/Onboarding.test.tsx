import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Onboarding } from '../src/components/Onboarding';
import { defaultPreferences } from '../src/state/model';
import type { UserPreferences } from '../src/state/model';

describe('Onboarding', () => {
  it('completes all six local-first steps with multiple modules preserved', () => {
    const onComplete = vi.fn<(preferences: UserPreferences) => void>();
    render(<Onboarding initial={defaultPreferences} onComplete={onComplete} />);
    expect(screen.getByText('离线优先')).toBeVisible();
    for (let step = 0; step < 5; step += 1) {
      fireEvent.click(screen.getByRole('button', { name: /继续/ }));
    }
    fireEvent.click(screen.getByRole('button', { name: /显示第一张卡/ }));
    expect(onComplete).toHaveBeenCalledOnce();
    expect(onComplete.mock.calls[0]?.[0].selectedStages).toEqual(['senior', 'cet4']);
  });

  it('accepts deliberate custom new-word and review limits above the quick ranges', () => {
    const onComplete = vi.fn<(preferences: UserPreferences) => void>();
    render(<Onboarding initial={defaultPreferences} onComplete={onComplete} />);
    fireEvent.click(screen.getByRole('button', { name: /继续/ }));
    fireEvent.click(screen.getByRole('button', { name: /继续/ }));

    fireEvent.click(screen.getByRole('button', { name: '自定义每日新词' }));
    fireEvent.change(screen.getByRole('spinbutton', { name: '每日新词自定义数量' }), {
      target: { value: '120' },
    });
    fireEvent.click(screen.getByRole('button', { name: '自定义每日复习' }));
    fireEvent.change(screen.getByRole('spinbutton', { name: '每日复习自定义数量' }), {
      target: { value: '450' },
    });

    for (let step = 2; step < 5; step += 1) {
      fireEvent.click(screen.getByRole('button', { name: /继续/ }));
    }
    fireEvent.click(screen.getByRole('button', { name: /显示第一张卡/ }));
    expect(onComplete.mock.calls[0]?.[0]).toMatchObject({
      dailyNewLimit: 120,
      dailyReviewLimit: 450,
    });
  });
});
