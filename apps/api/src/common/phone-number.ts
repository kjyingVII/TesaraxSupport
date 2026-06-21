import { BadRequestException } from "@nestjs/common";

const countryRules = [
  { label: "Singapore", countryCode: "+65", minLength: 8, maxLength: 8, pattern: /^[3689]\d{7}$/ },
  { label: "Malaysia", countryCode: "+60", minLength: 8, maxLength: 10 },
  { label: "Indonesia", countryCode: "+62", minLength: 8, maxLength: 12 },
  { label: "Thailand", countryCode: "+66", minLength: 8, maxLength: 9 },
  { label: "Philippines", countryCode: "+63", minLength: 10, maxLength: 10 },
  { label: "Vietnam", countryCode: "+84", minLength: 9, maxLength: 10 },
  { label: "China", countryCode: "+86", minLength: 11, maxLength: 11 },
  { label: "India", countryCode: "+91", minLength: 10, maxLength: 10 },
  { label: "United States", countryCode: "+1", minLength: 10, maxLength: 10 }
];

export function parseOptionalPhoneNumber(value: string | null | undefined, fieldName: string) {
  const cleaned = cleanPhoneValue(value);
  if (!cleaned) return undefined;
  return validatePhoneNumber(cleaned, fieldName);
}

export function parseNullablePhoneNumber(value: string | null | undefined, fieldName: string) {
  if (value === null) return null;
  return parseOptionalPhoneNumber(value, fieldName) ?? null;
}

export function parseRequiredPhoneNumber(value: string | null | undefined, fieldName: string) {
  const cleaned = cleanPhoneValue(value);
  if (!cleaned) {
    throw new BadRequestException(`${fieldName} is required.`);
  }

  return validatePhoneNumber(cleaned, fieldName);
}

function cleanPhoneValue(value: string | null | undefined) {
  const cleaned = value?.trim();
  return cleaned ? cleaned : undefined;
}

function validatePhoneNumber(value: string, fieldName: string) {
  const rule = countryRules
    .slice()
    .sort((a, b) => b.countryCode.length - a.countryCode.length)
    .find((item) => value.startsWith(item.countryCode));

  if (!rule) {
    throw new BadRequestException(`${fieldName} must include a supported country code.`);
  }

  const localNumber = value.slice(rule.countryCode.length);

  if (!/^\d+$/.test(localNumber)) {
    throw new BadRequestException(`${fieldName} must contain digits after the country code.`);
  }

  if (localNumber.length < rule.minLength || localNumber.length > rule.maxLength) {
    throw new BadRequestException(`${fieldName} must be ${phoneLengthLabel(rule)} for ${rule.label}.`);
  }

  if (rule.pattern && !rule.pattern.test(localNumber)) {
    throw new BadRequestException(`${fieldName} is not a valid ${rule.label} phone number.`);
  }

  return `${rule.countryCode}${localNumber}`;
}

function phoneLengthLabel(rule: (typeof countryRules)[number]) {
  if (rule.minLength === rule.maxLength) {
    return `${rule.minLength} digits`;
  }

  return `${rule.minLength} to ${rule.maxLength} digits`;
}
