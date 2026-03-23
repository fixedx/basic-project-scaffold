/**
 * 雪花ID生成器
 * 生成16位数字ID
 */
export class SnowflakeIdGenerator {
  private static instance: SnowflakeIdGenerator;

  // 开始时间戳 (2024-01-01 00:00:00 UTC)
  private readonly epoch = 1704067200000n;

  // 机器ID (可通过环境变量配置)
  private readonly workerId: bigint;

  // 序列号
  private sequence = 0n;

  // 上次生成ID的时间戳
  private lastTimestamp = -1n;

  // 位数配置（总共16位数字）
  // 时间戳: 41位, 机器ID: 10位, 序列号: 12位
  private readonly workerIdBits = 10n;
  private readonly sequenceBits = 12n;

  // 最大值
  private readonly maxWorkerId = -1n ^ (-1n << this.workerIdBits);
  private readonly maxSequence = -1n ^ (-1n << this.sequenceBits);

  // 左移位数
  private readonly workerIdShift = this.sequenceBits;
  private readonly timestampShift = this.sequenceBits + this.workerIdBits;

  private constructor(workerId: bigint = 1n) {
    if (workerId > this.maxWorkerId || workerId < 0n) {
      throw new Error(`Worker ID must be between 0 and ${this.maxWorkerId}`);
    }
    this.workerId = workerId;
  }

  public static getInstance(workerId?: bigint): SnowflakeIdGenerator {
    if (!SnowflakeIdGenerator.instance) {
      const id = workerId || BigInt(process.env.WORKER_ID || '1');
      SnowflakeIdGenerator.instance = new SnowflakeIdGenerator(id);
    }
    return SnowflakeIdGenerator.instance;
  }

  /**
   * 生成雪花ID（16位数字字符串）
   */
  public generate(): string {
    let timestamp = this.getCurrentTimestamp();

    // 如果当前时间小于上次生成ID的时间戳，说明系统时钟回退，抛出异常
    if (timestamp < this.lastTimestamp) {
      throw new Error('Clock moved backwards. Refusing to generate id');
    }

    // 如果是同一毫秒内生成的，则序列号自增
    if (timestamp === this.lastTimestamp) {
      this.sequence = (this.sequence + 1n) & this.maxSequence;
      // 序列号溢出
      if (this.sequence === 0n) {
        // 阻塞到下一毫秒
        timestamp = this.waitNextMillis(this.lastTimestamp);
      }
    } else {
      // 不同毫秒内，序列号置为0
      this.sequence = 0n;
    }

    this.lastTimestamp = timestamp;

    // 组合生成ID
    const id =
      ((timestamp - this.epoch) << this.timestampShift) |
      (this.workerId << this.workerIdShift) |
      this.sequence;

    // 转换为16位字符串（如果不足16位则前面补0）
    return id.toString().padStart(16, '0');
  }

  /**
   * 批量生成ID
   */
  public generateBatch(count: number): string[] {
    const ids: string[] = [];
    for (let i = 0; i < count; i++) {
      ids.push(this.generate());
    }
    return ids;
  }

  /**
   * 获取当前时间戳（毫秒）
   */
  private getCurrentTimestamp(): bigint {
    return BigInt(Date.now());
  }

  /**
   * 阻塞到下一毫秒
   */
  private waitNextMillis(lastTimestamp: bigint): bigint {
    let timestamp = this.getCurrentTimestamp();
    while (timestamp <= lastTimestamp) {
      timestamp = this.getCurrentTimestamp();
    }
    return timestamp;
  }

  /**
   * 解析雪花ID，获取时间戳、机器ID和序列号
   */
  public parse(id: string): {
    timestamp: number;
    workerId: number;
    sequence: number;
    date: Date;
  } {
    const bigIntId = BigInt(id);

    const timestamp = Number((bigIntId >> this.timestampShift) + this.epoch);
    const workerId = Number(
      (bigIntId >> this.workerIdShift) & this.maxWorkerId,
    );
    const sequence = Number(bigIntId & this.maxSequence);

    return {
      timestamp,
      workerId,
      sequence,
      date: new Date(timestamp),
    };
  }
}

// 导出便捷方法
export const generateSnowflakeId = (): string => {
  return SnowflakeIdGenerator.getInstance().generate();
};

export const parseSnowflakeId = (id: string) => {
  return SnowflakeIdGenerator.getInstance().parse(id);
};
