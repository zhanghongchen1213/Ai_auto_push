// src/config/domains.ts
// 领域配置 - 前端和管道共享的唯一配置源
//
// ============================================================
// 新增领域操作指南：
// 1. 在下方 domains 数组中添加新配置项
// 2. 在 scripts/pipeline/sources/ 下创建同名 .ts 文件
//    （可复制 _template.ts 作为起点）
// 3. 完成！无需修改其他文件
//
// 色彩搭配建议：
// - color:    主色调，用于标题和边框（饱和度适中）
// - bgColor:  浅色背景，用于卡片底色（主色的极浅变体）
// - pillBg:   标签背景色（可与 bgColor 不同以增加层次）
// - pillText: 标签文字色（比 color 稍深，确保对比度）
// 推荐使用 HSL 色轮相邻色，避免与现有领域撞色
// ============================================================

export const domains = [
  {
    slug: "ai-tech",
    name: "AI技术",
    icon: "🤖",
    order: 1,
    color: "#3B82F6",
    bgColor: "#EFF6FF",
    pillBg: "#F0F5FF",
    pillText: "#1677FF",
  },
  {
    slug: "cross-border-ecom",
    name: "跨境电商",
    icon: "🌐",
    order: 2,
    color: "#10B981",
    bgColor: "#ECFDF5",
    pillBg: "#FFF7E6",
    pillText: "#D46B08",
  },
  {
    slug: "product-startup",
    name: "产品创业",
    icon: "💡",
    order: 3,
    color: "#F59E0B",
    bgColor: "#FFFBEB",
    pillBg: "#F6FFED",
    pillText: "#389E0D",
  },
  {
    slug: "github-trending",
    name: "GitHub热门",
    icon: "⭐",
    order: 4,
    color: "#8B5CF6",
    bgColor: "#F5F3FF",
    pillBg: "#F9F0FF",
    pillText: "#722ED1",
  },
] as const;

export type DomainSlug = (typeof domains)[number]["slug"];
export type DomainConfig = (typeof domains)[number];
