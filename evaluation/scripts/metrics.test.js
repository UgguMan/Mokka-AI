import {it,expect} from 'vitest';
import {computeMetrics} from './metrics.js';
it('computes known accuracy, abstention coverage, precision, recall and F1',()=>{const result=computeMetrics([{actual:'A',predicted:'A'},{actual:'A',predicted:'B'},{actual:'B',predicted:'B'},{actual:'B',predicted:'uncertain'}],['A','B','C']);expect(result.accuracy).toBe(.5);expect(result.coverage).toBe(.75);expect(result.perClass[0]).toMatchObject({precision:1,recall:.5});expect(result.perClass[0].f1).toBeCloseTo(2/3);expect(result.perClass[1].f1).toBe(.5);expect(result.macroF1).toBeCloseTo(7/12);expect(result.confusionMatrix.B['uncertain/unsupported']).toBe(1);expect(result.zeroSupportClasses).toEqual(['C']);});
it('handles empty evaluation without NaN',()=>{const r=computeMetrics([],['A']);expect(r.accuracy).toBe(0);expect(r.macroF1).toBe(0);expect(r.coverage).toBe(0);});
it('rejects unknown ground truth',()=>expect(()=>computeMetrics([{actual:'X',predicted:'A'}],['A'])).toThrow());
