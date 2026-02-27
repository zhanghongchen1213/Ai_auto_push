// src/lib/date-utils.ts
// 日期处理工具函数 - 统一使用 YYYY-MM-DD 字符串格式

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * 校验日期字符串是否为合法的 YYYY-MM-DD 格式
 */
export function isValidDateFormat(date: string): boolean {
  if (!DATE_REGEX.test(date)) return false;
  const [year, month, day] = date.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return (
    d.getFullYear() === year &&
    d.getMonth() === month - 1 &&
    d.getDate() === day
  );
}

/**
 * 断言日期字符串为合法的 YYYY-MM-DD 格式，不合法时抛出错误
 */
function assertValidDate(date: string): void {
  if (!isValidDateFormat(date)) {
    throw new Error(`无效的日期格式: "${date}"，期望 YYYY-MM-DD`);
  }
}

/**
 * 格式化日期为中文显示格式
 * "2026-02-26" -> "2026年2月26日"
 */
export function formatDateCN(date: string): string {
  assertValidDate(date);
  const [year, month, day] = date.split("-").map(Number);
  return `${year}年${month}月${day}日`;
}

/**
 * 格式化日期为带星期的中文显示
 * "2026-02-26" -> "2026年2月26日 周四"
 */
export function formatDateWithWeekday(date: string): string {
  assertValidDate(date);
  const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  const [year, month, day] = date.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return `${formatDateCN(date)} ${weekdays[d.getDay()]}`;
}

/**
 * 获取前一天的日期字符串
 */
export function getPrevDate(date: string): string {
  assertValidDate(date);
  const [year, month, day] = date.split("-").map(Number);
  const d = new Date(year, month - 1, day - 1);
  return toDateString(d);
}

/**
 * 获取后一天的日期字符串
 */
export function getNextDate(date: string): string {
  assertValidDate(date);
  const [year, month, day] = date.split("-").map(Number);
  const d = new Date(year, month - 1, day + 1);
  return toDateString(d);
}

/**
 * 比较两个日期字符串，返回负数/0/正数
 * 用于排序：升序 compareDates(a, b)，降序 compareDates(b, a)
 */
export function compareDates(a: string, b: string): number {
  return a.localeCompare(b);
}

/**
 * 将 Date 对象转为 YYYY-MM-DD 字符串（本地时间）
 */
export function toDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * 获取今天的日期字符串
 */
export function getTodayString(): string {
  return toDateString(new Date());
}
