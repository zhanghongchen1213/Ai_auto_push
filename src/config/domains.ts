// src/config/domains.ts
// 领域配置 - 前端和管道共享的唯一配置源

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
