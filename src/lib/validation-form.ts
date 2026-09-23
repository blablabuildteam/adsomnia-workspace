import type {
  Attachment,
  BusinessValueData,
  BusinessValueType,
  ValidationData,
} from "@/lib/validation-data";

const BUSINESS_VALUE_TYPE_IDS: BusinessValueType[] = [
  "speed",
  "cost-efficiency",
  "growth",
];

export function parseBusinessValue(
  formData: FormData,
): BusinessValueData | undefined {
  const types = formData
    .getAll("businessValueTypes")
    .map(String)
    .filter((t): t is BusinessValueType =>
      BUSINESS_VALUE_TYPE_IDS.includes(t as BusinessValueType),
    );

  if (types.length === 0) return undefined;

  const expectations: BusinessValueData["expectations"] = {};
  for (const type of types) {
    const raw = (formData.get(`businessValueExpectation_${type}`) as string)
      ?.trim();
    const score = Number(raw);
    if (Number.isFinite(score)) {
      const rounded = Math.round(score);
      if (rounded >= 1 && rounded <= 10) expectations[type] = rounded;
    }
  }

  return { types, expectations };
}

export function parseAttachments(formData: FormData): Attachment[] | undefined {
  const raw = formData.get("attachments") as string | null;
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export function parseValidationFormData(formData: FormData): ValidationData {
  return {
    businessValue: parseBusinessValue(formData),
    solutionDirection:
      (formData.get("solutionDirection") as string)?.trim() || undefined,
    tShirtSize: (formData.get("tShirtSize") as string)?.trim() || undefined,
    priority: (formData.get("priority") as string)?.trim() || undefined,
    leadProductionParty:
      (formData.get("leadProductionParty") as string)?.trim() || undefined,
    dependencies: (formData.get("dependencies") as string)?.trim() || undefined,
    risks: (formData.get("risks") as string)?.trim() || undefined,
    attachments: parseAttachments(formData),
  };
}
