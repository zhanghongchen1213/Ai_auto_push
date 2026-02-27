// scripts/pipeline/config-validator.ts
// 领域配置运行时校验 - Domain config runtime validation

import { domains } from "../../src/config/domains.ts";

/** 校验结果 */
export interface ValidationResult {
  /** 是否通过校验（无 error） */
  valid: boolean;
  /** 致命错误列表（会终止管道） */
  errors: string[];
  /** 警告列表（不终止管道） */
  warnings: string[];
}

/** 一致性检查结果 */
export interface ConsistencyResult {
  /** 匹配的领域 slug 列表 */
  matched: string[];
  /** 有领域配置但无信息源文件 */
  missingSource: string[];
  /** 有信息源文件但无领域配置 */
  orphanSource: string[];
}

/** slug 格式：仅允许小写字母、数字、连字符 */
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** hex 颜色格式：#RRGGBB */
const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

/** 领域配置必填字段及其期望类型 */
const REQUIRED_FIELDS: ReadonlyArray<[string, string]> = [
  ["slug", "string"],
  ["name", "string"],
  ["icon", "string"],
  ["order", "number"],
  ["color", "string"],
  ["bgColor", "string"],
  ["pillBg", "string"],
  ["pillText", "string"],
];

/** 需要校验 hex 颜色格式的字段 */
const COLOR_FIELDS = ["color", "bgColor", "pillBg", "pillText"] as const;

/**
 * 校验单个领域配置项
 * @param config - 待校验的配置对象
 * @param index - 在数组中的索引（用于错误信息定位）
 */
export function validateDomainConfig(
  config: unknown,
  index: number,
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (typeof config !== "object" || config === null) {
    return {
      valid: false,
      errors: [`[${index}] 配置项不是有效对象`],
      warnings,
    };
  }

  const obj = config as Record<string, unknown>;

  // 必填字段存在性和类型检查
  for (const [field, expectedType] of REQUIRED_FIELDS) {
    if (!(field in obj)) {
      errors.push(`[${index}] 缺少必填字段: ${field}`);
    } else if (typeof obj[field] !== expectedType) {
      errors.push(
        `[${index}] 字段 "${field}" 类型错误: 期望 ${expectedType}，实际 ${typeof obj[field]}`,
      );
    }
  }

  // slug 格式校验
  if (typeof obj.slug === "string" && !SLUG_PATTERN.test(obj.slug)) {
    errors.push(
      `[${index}] slug "${obj.slug}" 格式错误，仅允许小写字母、数字和连字符`,
    );
  }

  // 颜色字段格式校验
  for (const field of COLOR_FIELDS) {
    const value = obj[field];
    if (typeof value === "string" && !HEX_COLOR_PATTERN.test(value)) {
      errors.push(
        `[${index}] 字段 "${field}" 颜色格式错误: "${value}"，要求 #RRGGBB`,
      );
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * 校验所有领域配置（slug 唯一性、order 重复检查）
 * 直接读取 domains.ts 中的配置数组
 */
export function validateAllDomains(): ValidationResult {
  const allErrors: string[] = [];
  const allWarnings: string[] = [];

  // 逐项校验
  for (let i = 0; i < domains.length; i++) {
    const result = validateDomainConfig(domains[i], i);
    allErrors.push(...result.errors);
    allWarnings.push(...result.warnings);
  }

  // slug 唯一性检查
  const slugs = domains.map((d) => d.slug);
  const slugSet = new Set<string>();
  for (const slug of slugs) {
    if (slugSet.has(slug)) {
      allErrors.push(`slug "${slug}" 重复，每个领域的 slug 必须唯一`);
    }
    slugSet.add(slug);
  }

  // order 重复检查（警告，不终止）
  const orders = domains.map((d) => d.order);
  const orderSet = new Set<number>();
  for (const order of orders) {
    if (orderSet.has(order)) {
      allWarnings.push(`order ${order} 存在重复值，建议保持唯一`);
    }
    orderSet.add(order);
  }

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
  };
}

/**
 * 检查领域配置与信息源配置的一致性
 * @param domainSlugs - domains.ts 中的所有领域 slug
 * @param sourceSlugs - sources/ 目录下已注册的领域 slug
 */
export function checkConfigConsistency(
  domainSlugs: readonly string[],
  sourceSlugs: readonly string[],
): ConsistencyResult {
  const domainSet = new Set(domainSlugs);
  const sourceSet = new Set(sourceSlugs);

  const matched: string[] = [];
  const missingSource: string[] = [];
  const orphanSource: string[] = [];

  for (const slug of domainSlugs) {
    if (sourceSet.has(slug)) {
      matched.push(slug);
    } else {
      missingSource.push(slug);
    }
  }

  for (const slug of sourceSlugs) {
    if (!domainSet.has(slug)) {
      orphanSource.push(slug);
    }
  }

  return { matched, missingSource, orphanSource };
}
