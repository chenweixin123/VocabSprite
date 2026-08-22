import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { initialMastery, learningDirections } from '@vocabsprite/domain';
import { clampCardPosition } from '../src/components/cardPosition';
import { CompactCard } from '../src/components/CompactCard';
import { demoPacks } from '../src/data/demo';
import { defaultPreferences } from '../src/state/model';
import type { QuestionType, UserPreferences } from '../src/state/model';

const questionTypes: readonly QuestionType[] = [
  'word-meaning',
  'meaning-word',
  'sentence-gap',
  'confusion-choice',
  'audio-word',
  'visual-word',
];

const sense = demoPacks.flatMap((pack) => pack.senses).find((item) => item.visualAssetId);

function renderCard(
  questionType: QuestionType,
  onSizeChange?: (size: { readonly width: number; readonly height: number }) => void,
  preferences: UserPreferences = defaultPreferences,
) {
  if (sense === undefined) throw new Error('visual demo fixture is missing');
  const onSnooze = vi.fn();
  const onNext = vi.fn();
  const onPreferences = vi.fn();
  const onOpenSettings = vi.fn();
  render(
    <CompactCard
      sense={sense}
      questionType={questionType}
      preferences={preferences}
      mastery={learningDirections.map((direction) => initialMastery(direction))}
      prefersReducedMotion
      revealed={false}
      whyNow="测试中的确定性到期原因"
      rescue={false}
      position={{ x: 8, y: 8 }}
      onPosition={vi.fn()}
      onReveal={vi.fn()}
      onFeedback={vi.fn()}
      onConfusion={vi.fn()}
      onNext={onNext}
      onSnooze={onSnooze}
      onExpand={vi.fn()}
      onOpenSettings={onOpenSettings}
      onMinimize={vi.fn()}
      onPreferences={onPreferences}
      {...(onSizeChange === undefined ? {} : { onSizeChange })}
    />,
  );
  return { onSnooze, onNext, onPreferences, onOpenSettings };
}

describe('CompactCard', () => {
  it('clamps the complete card inside the visible work area', () => {
    expect(
      clampCardPosition(
        { x: 900, y: -100 },
        { width: 1024, height: 768 },
        { width: 328, height: 420 },
      ),
    ).toEqual({ x: 688, y: 8 });
  });

  it.each(questionTypes)('renders the %s question type without taking focus', (type) => {
    renderCard(type);
    expect(screen.getByRole('article')).toBeInTheDocument();
    expect(document.activeElement).toBe(document.body);
  });

  it('maps close to snooze and never to deletion or next-card', () => {
    const { onSnooze, onNext } = renderCard('word-meaning');
    fireEvent.click(screen.getByRole('button', { name: '关闭并稍后再出现' }));
    expect(onSnooze).toHaveBeenCalledWith(15);
    expect(onNext).not.toHaveBeenCalled();
  });

  it('shows an explainable why-now reason', () => {
    renderCard('word-meaning');
    fireEvent.click(screen.getByText('为什么现在出现？'));
    expect(screen.getByText('测试中的确定性到期原因')).toBeVisible();
  });

  it('keeps learning usable when speech synthesis is unavailable', () => {
    Reflect.deleteProperty(window, 'speechSynthesis');
    renderCard('audio-word');
    fireEvent.click(screen.getByRole('button', { name: /播放.*的发音/ }));
    expect(screen.getByRole('status')).toHaveTextContent('仍可继续学习');
  });

  it('replaces a failed visual asset with a local text fallback', () => {
    renderCard('visual-word');
    fireEvent.error(screen.getByRole('img', { name: /原创助记场景/ }));
    expect(screen.getByRole('img', { name: '本地图景不可用' })).toBeVisible();
  });

  it('offers quick card settings and keeps the optional hint disabled by default', () => {
    const { onPreferences, onOpenSettings } = renderCard('word-meaning');
    expect(screen.queryByRole('button', { name: '给我一点提示' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '打开卡片快捷设置' }));
    expect(screen.getByRole('region', { name: '卡片快捷设置' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '宽大' }));
    expect(onPreferences).toHaveBeenCalledWith(
      expect.objectContaining({ compactCardSize: 'large' }),
    );
    fireEvent.click(screen.getByRole('button', { name: '海盐蓝' }));
    expect(onPreferences).toHaveBeenCalledWith(
      expect.objectContaining({ compactCardColor: 'blue' }),
    );
    fireEvent.click(screen.getByRole('checkbox', { name: '想不起来时提供提示' }));
    expect(onPreferences).toHaveBeenCalledWith(
      expect.objectContaining({ hintEnabled: true }),
    );
    fireEvent.click(screen.getByRole('button', { name: /打开全部设置/ }));
    expect(onOpenSettings).toHaveBeenCalledOnce();
  });

  it('shows a non-answer hint only after the user opts in and asks for it', () => {
    renderCard('meaning-word', undefined, {
      ...defaultPreferences,
      hintEnabled: true,
    });
    fireEvent.click(screen.getByRole('button', { name: '给我一点提示' }));
    const hint = screen.getByRole('status');
    expect(hint).toHaveTextContent(/首字母.*共 \d+ 个字母/);
    expect(hint).not.toHaveTextContent(sense?.lemma ?? 'missing-fixture');
  });

  it('retries the same content size after native startup geometry changes', () => {
    const animationFrame = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((callback) => {
        callback(0);
        return 1;
      });
    const cancelAnimationFrame = vi
      .spyOn(window, 'cancelAnimationFrame')
      .mockImplementation(() => undefined);
    const onSizeChange = vi.fn();
    renderCard('word-meaning', onSizeChange);
    expect(onSizeChange).toHaveBeenCalledOnce();

    fireEvent(window, new Event('resize'));
    expect(onSizeChange).toHaveBeenCalledTimes(2);
    expect(onSizeChange.mock.calls[1]).toEqual(onSizeChange.mock.calls[0]);
    animationFrame.mockRestore();
    cancelAnimationFrame.mockRestore();
  });
});
