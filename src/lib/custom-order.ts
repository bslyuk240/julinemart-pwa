import type {
  CartCustomisation,
  CustomFieldDefinition,
  ProductCustomisationSchema,
} from '@/types/custom-order';

type CustomisationFieldsSchema = Pick<ProductCustomisationSchema, 'id' | 'fields'>;

export function computeCustomisationAdjustment(
  schema: CustomisationFieldsSchema,
  fieldValues: Record<string, string | number>
): number {
  let total = 0;
  for (const field of schema.fields) {
    const raw = fieldValues[field.id];
    if (raw == null || raw === '') continue;
    if (field.type === 'dropdown' && field.options?.length) {
      const opt = field.options.find((o) => o.value === String(raw));
      if (opt?.price_delta) total += Number(opt.price_delta);
    } else if (field.price_delta) {
      total += Number(field.price_delta);
    }
  }
  return Math.round(total * 100) / 100;
}

export function buildCustomisationSummary(
  schema: CustomisationFieldsSchema,
  fieldValues: Record<string, string | number>
): string[] {
  return schema.fields
    .map((field) => {
      const raw = fieldValues[field.id];
      if (raw == null || raw === '') return null;
      let display = String(raw);
      if (field.type === 'dropdown' && field.options?.length) {
        display = field.options.find((o) => o.value === String(raw))?.label || display;
      }
      return `${field.label}: ${display}`;
    })
    .filter((line): line is string => Boolean(line));
}

export function validateCustomisation(
  schema: CustomisationFieldsSchema,
  fieldValues: Record<string, string | number>
): string | null {
  for (const field of schema.fields) {
    const raw = fieldValues[field.id];
    const empty = raw == null || String(raw).trim() === '';
    if (field.required && empty) {
      return `${field.label} is required`;
    }
    if (field.type === 'number' && !empty) {
      const n = Number(raw);
      if (!Number.isFinite(n)) return `${field.label} must be a number`;
      if (field.min != null && n < field.min) return `${field.label} must be at least ${field.min}`;
      if (field.max != null && n > field.max) return `${field.label} must be at most ${field.max}`;
    }
    if (field.type === 'dropdown' && !empty) {
      const options = field.options || [];
      if (!options.some((o) => o.value === String(raw))) {
        return `${field.label} has an invalid selection`;
      }
    }
  }
  return null;
}

export function buildCartCustomisation(
  schema: CustomisationFieldsSchema,
  fieldValues: Record<string, string | number>
): CartCustomisation {
  const price_adjustment = computeCustomisationAdjustment(schema, fieldValues);
  return {
    schema_id: schema.id,
    field_values: fieldValues,
    price_adjustment,
    summary_lines: buildCustomisationSummary(schema, fieldValues),
  };
}

export function customisationCartKey(custom?: CartCustomisation | null): string {
  if (!custom) return '';
  return `${custom.schema_id}:${JSON.stringify(custom.field_values)}`;
}

export function productionWindowLabel(schema: ProductCustomisationSchema): string | null {
  const min = schema.production_days_min;
  const max = schema.production_days_max;
  if (min && max && min !== max) return `${min}–${max} days to make`;
  if (min) return `${min}+ days to make`;
  if (max) return `Up to ${max} days to make`;
  return null;
}

/** True only when vendor/admin has saved a schema with at least one field. */
export function isCustomisableProduct(
  schema?: ProductCustomisationSchema | null
): schema is ProductCustomisationSchema {
  return Boolean(schema?.id && Array.isArray(schema.fields) && schema.fields.length > 0);
}
