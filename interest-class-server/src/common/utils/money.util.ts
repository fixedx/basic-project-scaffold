/**
 * 金额计算工具类（基于 decimal.js，解决浮点数精度问题）
 *
 * 问题根因：IEEE 754 浮点数运算在金额计算中会产生精度误差。
 *   例：0.1 + 0.2 === 0.30000000000000004 ✗
 *   在累加多个金额或百分比运算时误差会放大，可能导致退款金额与实际多扣/少扣几分钱。
 *
 * 解决方案：使用 decimal.js 进行高精度十进制运算。
 *
 * 使用规范：
 *   - 所有涉及金额运算的地方均应使用此工具类
 *   - 禁止直接对 float 类型的金额字段做乘法/加法
 *   - 最终结果使用 toNumber() 或 toFixed() 转换回 number/string
 */
import Decimal from 'decimal.js';

export class MoneyMath {
  /**
   * 创建 Decimal 实例
   */
  static d(value: number | string): Decimal {
    return new Decimal(value);
  }

  /**
   * 元 → 分（向最近整数取整）
   * 例：yuan2fen(9.99) = 999,  yuan2fen('10.00') = 1000
   */
  static yuan2fen(yuan: number | string): number {
    return this.d(yuan).mul(100).round().toNumber();
  }

  /**
   * 分 → 元（精确保留两位小数）
   * 例：fen2yuan(999) = 9.99,  fen2yuan(1000) = 10.00
   */
  static fen2yuan(fen: number): number {
    return this.d(fen).div(100).toNumber();
  }

  /**
   * 按百分比计算金额（分）
   * ratioPercent: 百分比整数，如 10 表示 10%
   * 使用向下取整（floor），避免退款超出原始金额
   * 例：percentOfFen(1000, 10) = 100  (10 元的 10% = 1 元)
   */
  static percentOfFen(amountFen: number, ratioPercent: number): number {
    return this.d(amountFen)
      .mul(ratioPercent)
      .div(100)
      .floor()
      .toNumber();
  }

  /**
   * 按小数比例计算金额（分）
   * ratio: 0~1 之间的小数，如 0.1 表示 10%
   * 使用向下取整（floor）
   */
  static ratioOfFen(amountFen: number, ratio: number): number {
    return this.d(amountFen).mul(ratio).floor().toNumber();
  }

  /**
   * 安全相加（元）
   * 避免多个浮点数直接相加导致的精度误差
   */
  static addYuan(...amounts: (number | string)[]): number {
    let sum = new Decimal(0);
    for (const amount of amounts) {
      sum = sum.add(this.d(amount).mul(100));
    }
    return sum.div(100).toNumber();
  }

  /**
   * 安全相减（元）
   */
  static subtractYuan(a: number | string, b: number | string): number {
    return this.d(a)
      .mul(100)
      .sub(this.d(b).mul(100))
      .div(100)
      .toNumber();
  }

  /**
   * 安全乘法（元）
   */
  static multiplyYuan(a: number | string, b: number | string): number {
    return this.d(a).mul(b).toNumber();
  }

  /**
   * 安全除法（元）
   */
  static divideYuan(a: number | string, b: number | string): number {
    return this.d(a).div(b).toNumber();
  }

  /**
   * 计算百分比（保留2位小数）
   * 例：calculatePercent(1, 10) = 10.00 (1是10的10%)
   */
  static calculatePercent(numerator: number, denominator: number): number {
    if (denominator === 0) return 0;
    return this.d(numerator).div(denominator).mul(100).toDecimalPlaces(2).toNumber();
  }

  /**
   * 计算比例（保留4位小数）
   * 例：calculateRatio(1, 4) = 0.25
   */
  static calculateRatio(numerator: number, denominator: number): number {
    if (denominator === 0) return 0;
    return this.d(numerator).div(denominator).toDecimalPlaces(4).toNumber();
  }

  /**
   * 格式化为保留两位小数的字符串（前端展示用）
   */
  static format(yuan: number | string): string {
    return this.d(yuan).toDecimalPlaces(2).toString();
  }

  /**
   * 格式化为保留4位小数的字符串（比例展示用）
   */
  static formatRatio(ratio: number | string): string {
    return this.d(ratio).toDecimalPlaces(4).toString();
  }
}
