/**
 * 整数分运算工具（Fix 10）
 *
 * 问题根因：IEEE 754 浮点数运算在金额计算中会产生精度误差。
 *   例：(0.1 + 0.2).toFixed(2) === '0.30' ✓ 但 0.1 + 0.2 === 0.30000000000000004 ✗
 *   在累加多个金额或百分比运算时误差会放大，可能导致退款金额与实际多扣/少扣几分钱。
 *
 * 解决方案：所有金额统一转换为整数分（分），用整数乘除法计算，最终再还原为元。
 *   支付金额（元 → 分）→ 整数运算 → 结果（分 → 元）
 *
 * 使用规范：
 *   - 所有涉及金额运算的地方均应使用此工具类
 *   - 禁止直接对 decimal/float 类型的金额字段做乘法/加法
 *   - 前端展示时可保留两位小数，但后端计算必须走整数分
 */
export class MoneyMath {
  /**
   * 元 → 分（向最近整数取整）
   * 例：yuan2fen(9.99) = 999,  yuan2fen('10.00') = 1000
   */
  static yuan2fen(yuan: number | string): number {
    return Math.round(Number(yuan) * 100);
  }

  /**
   * 分 → 元（精确保留两位小数）
   * 例：fen2yuan(999) = 9.99,  fen2yuan(1000) = 10
   */
  static fen2yuan(fen: number): number {
    return fen / 100;
  }

  /**
   * 按百分比计算金额（分）
   * ratioPercent: 百分比整数，如 10 表示 10%
   * 使用向下取整（floor），避免退款超出原始金额
   * 例：percentOfFen(1000, 10) = 100  (10 元的 10% = 1 元)
   */
  static percentOfFen(amountFen: number, ratioPercent: number): number {
    return Math.floor((amountFen * ratioPercent) / 100);
  }

  /**
   * 按小数比例计算金额（分）
   * ratio: 0~1 之间的小数，如 0.1 表示 10%
   * 使用向下取整（floor）
   */
  static ratioOfFen(amountFen: number, ratio: number): number {
    return Math.floor(amountFen * ratio);
  }

  /**
   * 安全相加（分）
   * 避免多个元级别浮点数直接相加导致的精度误差
   */
  static addYuan(...amounts: (number | string)[]): number {
    const totalFen = amounts.reduce<number>(
      (sum, a) => sum + MoneyMath.yuan2fen(a),
      0,
    );
    return MoneyMath.fen2yuan(totalFen);
  }

  /**
   * 安全相减（分）
   */
  static subtractYuan(a: number | string, b: number | string): number {
    return MoneyMath.fen2yuan(
      MoneyMath.yuan2fen(a) - MoneyMath.yuan2fen(b),
    );
  }

  /**
   * 格式化为保留两位小数的字符串（前端展示用）
   */
  static format(yuan: number | string): string {
    return Number(yuan).toFixed(2);
  }
}
