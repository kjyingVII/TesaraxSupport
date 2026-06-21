"use client";

const countryCodes = [
  { label: "SG", value: "+65", minLength: 8, maxLength: 8, pattern: /^[3689]\d{7}$/ },
  { label: "MY", value: "+60", minLength: 8, maxLength: 10 },
  { label: "ID", value: "+62", minLength: 8, maxLength: 12 },
  { label: "TH", value: "+66", minLength: 8, maxLength: 9 },
  { label: "PH", value: "+63", minLength: 10, maxLength: 10 },
  { label: "VN", value: "+84", minLength: 9, maxLength: 10 },
  { label: "CN", value: "+86", minLength: 11, maxLength: 11 },
  { label: "IN", value: "+91", minLength: 10, maxLength: 10 },
  { label: "US", value: "+1", minLength: 10, maxLength: 10 }
];

type PhoneNumberInputProps = {
  label: string;
  value: string;
  required?: boolean;
  className?: string;
  inputClassName?: string;
  onChange: (value: string) => void;
};

export function PhoneNumberInput({
  label,
  value,
  required,
  className,
  inputClassName = "field-input h-11 font-medium text-neutral-900 dark:text-neutral-100",
  onChange
}: PhoneNumberInputProps) {
  const parsed = parsePhoneNumber(value);
  const selectedCountry = getCountryByCode(parsed.countryCode);
  const hasPhoneNumber = Boolean(parsed.localNumber);
  const phoneNumberIsInvalid = hasPhoneNumber && !isValidPhoneNumber(value);
  const validationMessage = getPhoneValidationMessage(selectedCountry);

  function updateCountryCode(countryCode: string) {
    onChange(parsed.localNumber ? `${countryCode}${parsed.localNumber}` : "");
  }

  function updateLocalNumber(rawValue: string) {
    const digits = rawValue.replace(/\D/g, "").replace(/^0+/, "");
    onChange(digits ? `${parsed.countryCode}${digits}` : "");
  }

  return (
    <div className={className}>
      <span className="field-label">{label}</span>
      <div className="grid gap-2 sm:grid-cols-[136px_minmax(0,1fr)]">
        <label className="block">
          <span className="field-meta-label">Country code</span>
          <select
            aria-label={`${label} country code`}
            className={`${inputClassName} mt-2`}
            value={parsed.countryCode}
            onChange={(event) => updateCountryCode(event.target.value)}
          >
            {countryCodes.map((country) => (
              <option key={country.value} value={country.value}>
                {country.label} {country.value}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="field-meta-label">Phone number</span>
          <input
            aria-label={`${label} phone number`}
            aria-describedby={phoneNumberIsInvalid ? `${phoneInputId(label)}-error` : undefined}
            aria-invalid={phoneNumberIsInvalid}
            autoComplete="tel-national"
            className={`${inputClassName} mt-2`}
            inputMode="tel"
            maxLength={selectedCountry.maxLength}
            minLength={selectedCountry.minLength}
            pattern={getPhoneNumberPattern(selectedCountry)}
            placeholder={parsed.countryCode === "+65" ? "91234567" : "Phone number"}
            required={required}
            title={validationMessage}
            value={parsed.localNumber}
            onChange={(event) => updateLocalNumber(event.target.value)}
            onInput={(event) => event.currentTarget.setCustomValidity("")}
            onInvalid={(event) => event.currentTarget.setCustomValidity(validationMessage)}
          />
          {phoneNumberIsInvalid ? (
            <span id={`${phoneInputId(label)}-error`} className="mt-2 block text-xs font-medium text-red-700 dark:text-red-300">
              {validationMessage}
            </span>
          ) : null}
        </label>
      </div>
    </div>
  );
}

export function isValidPhoneNumber(value: string) {
  const parsed = parsePhoneNumber(value);
  if (!parsed.localNumber) return false;

  const country = getCountryByCode(parsed.countryCode);
  return (
    parsed.localNumber.length >= country.minLength &&
    parsed.localNumber.length <= country.maxLength &&
    (!country.pattern || country.pattern.test(parsed.localNumber))
  );
}

export function parsePhoneNumber(value: string) {
  const cleaned = value.trim();
  const country = countryCodes
    .slice()
    .sort((a, b) => b.value.length - a.value.length)
    .find((item) => cleaned.startsWith(item.value));

  if (country) {
    return {
      countryCode: country.value,
      localNumber: cleaned.slice(country.value.length).replace(/\D/g, "").replace(/^0+/, "")
    };
  }

  return {
    countryCode: "+65",
    localNumber: cleaned.replace(/\D/g, "").replace(/^0+/, "")
  };
}

function getCountryByCode(countryCode: string) {
  return countryCodes.find((item) => item.value === countryCode) ?? countryCodes[0];
}

function getPhoneNumberPattern(country: (typeof countryCodes)[number]) {
  if (country.pattern) {
    return country.pattern.source;
  }

  return `\\d{${country.minLength},${country.maxLength}}`;
}

function getPhoneValidationMessage(country: (typeof countryCodes)[number]) {
  if (country.value === "+65") {
    return "Enter a valid Singapore phone number with 8 digits, starting with 3, 6, 8, or 9.";
  }

  if (country.minLength === country.maxLength) {
    return `Enter a valid ${country.label} phone number with ${country.minLength} digits.`;
  }

  return `Enter a valid ${country.label} phone number with ${country.minLength} to ${country.maxLength} digits.`;
}

function phoneInputId(label: string) {
  return `${label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-phone-number`;
}
