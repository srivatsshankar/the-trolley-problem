import { describe, it, expect } from 'vitest';
import { shouldEnableWheelSparks } from '../../utils/SparkLogic';

describe('SparkLogic', () => {
  it('enables sparks at threshold', () => {
    expect(shouldEnableWheelSparks(0, 5)).toBe(false);
    expect(shouldEnableWheelSparks(4, 5)).toBe(false);
    expect(shouldEnableWheelSparks(5, 5)).toBe(true);
    expect(shouldEnableWheelSparks(8, 5)).toBe(true);
  });
});
