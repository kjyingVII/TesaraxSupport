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
  inputClassName = "field-input h-11",
  onChange
}: PhoneNumberInputProps) {
  const parsed = parsePhoneNumber(value);

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
      <div className="grid grid-cols-[112px_minmax(0,1fr)] gap-2">
        <select className={inputClassName} value={parsed.countryCode} onChange={(event) => updateCountryCode(event.target.value)}>
          {countryCodes.map((country) => (
            <option key={country.value} value={country.value}>
              {country.label} {country.value}
            </option>
          ))}
        </select>
        <input
          className={inputClassName}
          inputMode="tel"
          placeholder={parsed.countryCode === "+65" ? "91234567" : "Phone number"}
          required={required}
          value={parsed.localNumber}
          onChange={(event) => updateLocalNumber(event.target.value)}
        />
      </div>
    </div>
  );
}

export function isValidPhoneNumber(value: string) {
  const parsed = parsePhoneNumber(value);
  if (!parsed.localNumber) return false;

  const country = countryCodes.find((item) => item.value === parsed.countryCode) ?? countryCodes[0];
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
