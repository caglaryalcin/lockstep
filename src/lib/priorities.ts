import type { Priority, PriorityKey } from "~/types/PSC";

export const priorityDefinitions: readonly {
  key: PriorityKey;
  label: string;
  badgeColor: "info" | "success" | "neutral" | "warning" | "error";
  chartColor: string;
  radarColor: string;
}[] = [
  {
    key: "basic",
    label: "Basic",
    badgeColor: "info",
    chartColor: "hsl(var(--in, 198 93% 60%))",
    radarColor: "hsl(198 93% 60%/75%)",
  },
  {
    key: "essential",
    label: "Essential",
    badgeColor: "success",
    chartColor: "hsl(var(--su, 158 64% 52%))",
    radarColor: "hsl(158 64% 52%/75%)",
  },
  {
    key: "recommended",
    label: "Recommended",
    badgeColor: "neutral",
    chartColor: "hsl(var(--n, 219 14% 28%))",
    radarColor: "hsl(219 14% 28%/75%)",
  },
  {
    key: "optional",
    label: "Optional",
    badgeColor: "warning",
    chartColor: "hsl(var(--wa, 43 96% 56%))",
    radarColor: "hsl(43 96% 56%/75%)",
  },
  {
    key: "advanced",
    label: "Advanced",
    badgeColor: "error",
    chartColor: "hsl(var(--er, 0 91% 71%))",
    radarColor: "hsl(0 91% 71%/75%)",
  },
];

const priorityKeys = priorityDefinitions.map((priority) => priority.key);

export const normalizePriority = (priority: Priority | string): PriorityKey => {
  const normalized = priority.toLocaleLowerCase().replace(/ /g, "-") as PriorityKey;
  return priorityKeys.includes(normalized) ? normalized : "optional";
};

export const getPriorityDefinition = (priority: Priority | string) => {
  const key = normalizePriority(priority);
  return priorityDefinitions.find((definition) => definition.key === key) || priorityDefinitions[3];
};
