import React from 'react';

interface PhoneInputProps {
  phone: string;
  countryCode: string;
  onPhoneChange: (val: string) => void;
  onCountryCodeChange: (val: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  hasError?: boolean;
  autoFocus?: boolean;
  className?: string;
}

const PhoneInput: React.FC<PhoneInputProps> = ({
  phone,
  countryCode,
  onPhoneChange,
  onCountryCodeChange,
  placeholder = '9876543210',
  required = false,
  disabled = false,
  hasError = false,
  autoFocus = false,
  className = '',
}) => {
  const borderClass = hasError
    ? 'border-red-400 focus-within:border-red-500 focus-within:ring-red-100'
    : 'border-gray-200 focus-within:border-blue-500 focus-within:ring-blue-100';

  return (
    <div
      className={`flex items-center rounded-lg border bg-white focus-within:ring-2 transition-all overflow-hidden ${borderClass} ${disabled ? 'opacity-60 bg-gray-50' : ''} ${className}`}
    >
      {/* Static + sign */}
      <span className="pl-3 pr-1 text-gray-500 text-sm font-medium select-none">+</span>

      {/* Country code input — editable, click to change */}
      <input
        type="text"
        inputMode="numeric"
        value={countryCode}
        onChange={(e) => onCountryCodeChange(e.target.value.replace(/\D/g, '').slice(0, 4))}
        disabled={disabled}
        title="Click to change country code"
        className="w-10 py-2 text-sm text-blue-600 font-semibold bg-transparent border-none outline-none focus:ring-0 cursor-text hover:text-blue-700"
        aria-label="Country code"
      />

      {/* Divider */}
      <span className="text-gray-300 text-lg select-none leading-none">|</span>

      {/* Phone number input */}
      <input
        type="tel"
        inputMode="numeric"
        value={phone}
        onChange={(e) => onPhoneChange(e.target.value.replace(/\D/g, '').slice(0, 10))}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        autoFocus={autoFocus}
        className="flex-1 px-2 py-2 text-sm text-gray-800 bg-transparent border-none outline-none focus:ring-0"
        aria-label="Phone number"
      />
    </div>
  );
};

export default PhoneInput;
