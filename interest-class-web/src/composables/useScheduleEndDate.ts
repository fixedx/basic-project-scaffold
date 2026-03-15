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
   * 课程总课时标签，如 "共20节课"
   */
  const totalLessonsLabel = computed(() => {
    const total = selectedCourse.value?.skus?.[0]?.total_lessons
    return total ? `共${total}节课` : ''
  })

  /**
   * 根据课程总课时 + 每周上课天数 + 开始日期，计算结束日期。
   * 返回最后一节课所在日期的 YYYY-MM-DD 字符串；
   * 若数据不足则返回 ""。
   *
   * @param startDate - "YYYY-MM-DD" 格式的开始日期
   */
  const computeEndDate = (startDate: string): string => {
    const totalLessons = selectedCourse.value?.skus?.[0]?.total_lessons
    const daysCount = selectedDays.value.length

    if (!totalLessons || !daysCount || !startDate) return ''

    // 将 day_of_week（1=周一…7=周日）转为 JS getDay()（0=周日…6=周六）
    const targetJsDays = selectedDays.value.map((d) => {
      const n = parseInt(d)
      return n === 7 ? 0 : n
    })

    const [y, m, d] = startDate.split('-').map(Number)
    const cursor = new Date(y, m - 1, d)
    let count = 0
    let lastDate = new Date(cursor)

    // 从开始日期逐天迭代，直到凑满 total_lessons
    while (count < totalLessons) {
      if (targetJsDays.includes(cursor.getDay())) {
        count++
        lastDate = new Date(cursor)
      }
      if (count < totalLessons) {
        cursor.setDate(cursor.getDate() + 1)
      }
    }

    const yy = lastDate.getFullYear()
    const mm = String(lastDate.getMonth() + 1).padStart(2, '0')
    const dd = String(lastDate.getDate()).padStart(2, '0')
    return `${yy}-${mm}-${dd}`
  }

  return { computeEndDate, totalLessonsLabel }
}
