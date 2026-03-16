import { computed } from 'vue'
import type { Ref } from 'vue'
import type { Course } from '@/api/course'

/**
 * 排课结束日期自动计算 Hook
 *
 * 根据所选课程第一个 SKU 的 total_lessons（总课时数）、
 * 每周上课天数和开始日期，自动推算最后一节课的日期作为结束日期。
 *
 * 用法（批量排课页）：
 *   const { computeEndDate, totalLessonsLabel } = useScheduleEndDate(selectedCourse, selectedDays)
 *   // 课程/天数/开始日期变化后：
 *   form.end_date = computeEndDate(form.start_date)
 */
export function useScheduleEndDate(
  selectedCourse: Ref<Course | null>,
  selectedDays: Ref<string[]>,
) {
  /**
   * 课程总课时标签
   * - 单天：如 "共12节课"
   * - 多天：如 "共24节（每天12节）"
   */
  const totalLessonsLabel = computed(() => {
    const total = selectedCourse.value?.skus?.[0]?.total_lessons
    if (!total) return ''
    const daysCount = selectedDays.value.length
    if (daysCount > 1) {
      return `共${total * daysCount}节（每天${total}节）`
    }
    return `共${total}节课`
  })

  /**
   * 根据课程总课时 + 每周上课天数 + 开始日期，计算结束日期。
   *
   * 新逻辑：每个选中的星期**独立**排满 total_lessons 节，
   * 结束日期 = 各星期第 total_lessons 次出现中最晚的那一天。
   *
   * 例：12 节课 + 选择周二和周四
   *   → 周二独立排 12 节，周四独立排 12 节
   *   → 结束日期取两者的第 12 次中较晚的日期
   *
   * @param startDate - "YYYY-MM-DD" 格式的开始日期
   */
  const computeEndDate = (startDate: string): string => {
    const totalLessons = selectedCourse.value?.skus?.[0]?.total_lessons
    const daysCount = selectedDays.value.length

    if (!totalLessons || !daysCount || !startDate) return ''

    // 将 day_of_week（1=周一…7=周日）转为 JS getDay()（0=周日…6=周六）
    const toJsDay = (d: string): number => {
      const n = parseInt(d)
      return n === 7 ? 0 : n
    }

    const [y, m, d] = startDate.split('-').map(Number)
    const startDateObj = new Date(y, m - 1, d)
    let latestDate = new Date(startDateObj)

    // 每个选中的星期独立计算第 totalLessons 次出现的日期
    for (const dayStr of selectedDays.value) {
      const targetJsDay = toJsDay(dayStr)
      const cursor = new Date(startDateObj)
      let count = 0

      while (count < totalLessons) {
        if (cursor.getDay() === targetJsDay) {
          count++
          if (count === totalLessons) break
        }
        cursor.setDate(cursor.getDate() + 1)
      }

      // cursor 此时停在该星期第 totalLessons 次出现的日期
      if (cursor > latestDate) {
        latestDate = new Date(cursor)
      }
    }

    const yy = latestDate.getFullYear()
    const mm = String(latestDate.getMonth() + 1).padStart(2, '0')
    const dd = String(latestDate.getDate()).padStart(2, '0')
    return `${yy}-${mm}-${dd}`
  }

  return { computeEndDate, totalLessonsLabel }
}
