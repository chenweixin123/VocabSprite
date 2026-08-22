import { describe, expect, it } from 'vitest';
import { fusePacks, removePackMembership, resolveProgressSenseId } from '../src';
import { pack, sense } from './fixtures';

describe('pack fusion', () => {
  it('merges the same sense while retaining every membership', () => {
    const result = fusePacks([
      pack('cn.cet4.demo', 'cet4', [sense()]),
      pack('cn.cet6.demo', 'cet6', [sense()]),
    ]);
    expect(result.senses).toHaveLength(1);
    expect(result.senses[0]?.memberships.map((item) => item.stage)).toEqual([
      'cet4',
      'cet6',
    ]);
  });

  it('does not merge different meanings of the same spelling', () => {
    const result = fusePacks([
      pack('cn.senior.demo', 'senior', [
        sense(),
        sense({
          id: 'sense.adapt.work',
          identityKey: 'adapt|verb|make-suitable',
          senseKey: 'make-suitable',
          definitionZh: '改编',
          definitionEn: 'to rewrite a work for another form',
        }),
      ]),
    ]);
    expect(result.senses).toHaveLength(2);
  });

  it('reports conflicting content instead of silently overwriting', () => {
    const result = fusePacks([
      pack('one', 'cet4', [sense()]),
      pack('two', 'cet6', [sense({ definitionEn: 'incompatible text' })]),
    ]);
    expect(result.conflicts).toEqual([
      expect.objectContaining({ code: 'IDENTITY_CONTENT_MISMATCH' }),
    ]);
    expect(result.senses[0]?.sense.definitionEn).not.toBe('incompatible text');
  });

  it('keeps shared learning objects when one pack is deselected', () => {
    const fused = fusePacks([
      pack('one', 'cet4', [sense()]),
      pack('two', 'cet6', [sense()]),
    ]).senses;
    const remaining = removePackMembership(fused, 'one');
    expect(remaining).toHaveLength(1);
    expect(remaining[0]?.memberships[0]?.packId).toBe('two');
  });

  it('resolves stable aliases across upgrades and rejects cycles', () => {
    expect(resolveProgressSenseId('old', { old: 'middle', middle: 'new' })).toBe('new');
    expect(() => resolveProgressSenseId('old', { old: 'middle', middle: 'old' })).toThrow(
      'Alias cycle',
    );
  });
});
