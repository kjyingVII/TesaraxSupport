import { BadRequestException } from "@nestjs/common";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function parseOptionalEmail(value: string | null | undefined, fieldName: string) {
  const cleaned = cleanEmailValue(value);
  if (!cleaned) return undefined;
  return validateEmail(cleaned, fieldName);
}

export function parseNullableEmail(value: string | null | undefined, fieldName: string) {
  if (value === null) return null;
  return parseOptionalEmail(value, fieldName) ?? null;
}

export function parseRequiredEmail(value: string | null | undefined, fieldName: string) {
  const cleaned = cleanEmailValue(value);
  if (!cleaned) {
    throw new BadRequestException(`${fieldName} is required.`);
  }

  return validateEmail(cleaned, fieldName);
}

function cleanEmailValue(value: string | null | undefined) {
  const cleaned = value?.trim().toLowerCase();
  return cleaned ? cleaned : undefined;
}

function validateEmail(value: string, fieldName: string) {
  if (value.length > 254 || !emailPattern.test(value)) {
    throw new BadRequestException(`${fieldName} must be a valid email address.`);
  }

  return value;
}
