'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isValidPhoneNumber } from 'libphonenumber-js';
import {
  Lock,
  Clock,
  Tag,
  ShieldCheck,
  X,
} from '@phosphor-icons/react/dist/ssr';
import PaymentLogos from '@/components/PaymentLogos';
import { CHECKOUT_CONFIG } from '@/lib/checkout-config';
import type { CouponResult, CouponSuccess } from '@/lib/coupons';
import {
  readUtmCookie,
  readUtmFromUrl,
  writeUtmCookie,
  type UtmData,
} from '@/lib/utm';

// ── Types ────────────────────────────────────────────────────────────────────

interface Country { code: string; name: string; dial: string; flag: string; }

interface FormFields {
  firstName: string;
  lastName: string;
  email: string;
  city: string;
  phone: string;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  city?: string;
  phone?: string;
}

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}
interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description: string;
  image?: string;
  prefill?: { name?: string; email?: string; contact?: string };
  theme?: { color?: string };
  handler: (response: RazorpayResponse) => void;
  modal?: { ondismiss?: () => void };
}
interface RazorpayInstance { open: () => void; }
interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

// ── Country data (fixed infrastructure — do not modify) ──────────────────────

const COUNTRIES: Country[] = [
  { code: 'IN', name: 'India',          dial: '+91',  flag: '🇮🇳' },
  { code: 'US', name: 'United States',  dial: '+1',   flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', dial: '+44',  flag: '🇬🇧' },
  { code: 'AU', name: 'Australia',      dial: '+61',  flag: '🇦🇺' },
  { code: 'CA', name: 'Canada',         dial: '+1',   flag: '🇨🇦' },
  { code: 'SG', name: 'Singapore',      dial: '+65',  flag: '🇸🇬' },
  { code: 'AE', name: 'UAE',            dial: '+971', flag: '🇦🇪' },
  { code: 'NZ', name: 'New Zealand',    dial: '+64',  flag: '🇳🇿' },
  { code: 'DE', name: 'Germany',        dial: '+49',  flag: '🇩🇪' },
  { code: 'FR', name: 'France',         dial: '+33',  flag: '🇫🇷' },
  { code: 'NL', name: 'Netherlands',    dial: '+31',  flag: '🇳🇱' },
  { code: 'ZA', name: 'South Africa',   dial: '+27',  flag: '🇿🇦' },
  { code: 'MY', name: 'Malaysia',       dial: '+60',  flag: '🇲🇾' },
  { code: 'JP', name: 'Japan',          dial: '+81',  flag: '🇯🇵' },
  { code: 'NG', name: 'Nigeria',        dial: '+234', flag: '🇳🇬' },
  { code: 'KE', name: 'Kenya',          dial: '+254', flag: '🇰🇪' },
  { code: 'CH', name: 'Switzerland',    dial: '+41',  flag: '🇨🇭' },
  { code: 'SE', name: 'Sweden',         dial: '+46',  flag: '🇸🇪' },
  { code: 'NO', name: 'Norway',         dial: '+47',  flag: '🇳🇴' },
  { code: 'DK', name: 'Denmark',        dial: '+45',  flag: '🇩🇰' },
  { code: 'PH', name: 'Philippines',    dial: '+63',  flag: '🇵🇭' },
  { code: 'BD', name: 'Bangladesh',     dial: '+880', flag: '🇧🇩' },
  { code: 'PK', name: 'Pakistan',       dial: '+92',  flag: '🇵🇰' },
  { code: 'LK', name: 'Sri Lanka',      dial: '+94',  flag: '🇱🇰' },
  { code: 'NP', name: 'Nepal',          dial: '+977', flag: '🇳🇵' },
];

// ── Validation (fixed — do not modify) ───────────────────────────────────────

const NAME_RE = /^[a-zA-Z\s\-'.]{2,}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validateFields(fields: FormFields, countryCode: string): FormErrors {
  const errors: FormErrors = {};

  if (!fields.firstName.trim()) errors.firstName = 'First name is required.';
  else if (!NAME_RE.test(fields.firstName.trim())) errors.firstName = 'Letters, spaces, and hyphens only.';

  if (!fields.lastName.trim()) errors.lastName = 'Last name is required.';
  else if (!NAME_RE.test(fields.lastName.trim())) errors.lastName = 'Letters, spaces, and hyphens only.';

  if (!fields.email.trim()) errors.email = 'Email address is required.';
  else if (!EMAIL_RE.test(fields.email.trim())) errors.email = 'Enter a valid email address.';

  if (!fields.city.trim()) errors.city = 'City is required.';
  else if (fields.city.trim().length < 2) errors.city = 'Enter your city name.';

  if (!fields.phone.trim()) {
    errors.phone = 'Phone number is required.';
  } else {
    const country = COUNTRIES.find(c => c.code === countryCode);
    if (country) {
      try {
        const fullNumber = `${country.dial}${fields.phone.trim()}`;
        const valid = isValidPhoneNumber(fullNumber, countryCode as Parameters<typeof isValidPhoneNumber>[1]);
        if (!valid) errors.phone = `Invalid number for ${country.name}. Check digits.`;
      } catch { errors.phone = 'Enter a valid phone number.'; }
    }
  }
  return errors;
}

// UTM read/write/cookie helpers are imported from @/lib/utm (cookie-backed,
// shared with the landing page's <UtmCapture/>).

// ── Phone input sub-component ────────────────────────────────────────────────

interface PhoneInputProps {
  value: string;
  countryCode: string;
  onValueChange: (v: string) => void;
  onCountryChange: (code: string) => void;
  error?: string;
  touched: boolean;
  onBlur: () => void;
}

function CheckoutPhoneInput({
  value, countryCode, onValueChange, onCountryChange, error, touched, onBlur,
}: PhoneInputProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedCountry = COUNTRIES.find(c => c.code === countryCode) ?? COUNTRIES[0];

  const filtered = search.trim()
    ? COUNTRIES.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.dial.includes(search) ||
        c.code.toLowerCase().includes(search.toLowerCase())
      )
    : COUNTRIES;

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const hasError = touched && !!error;

  return (
    <div
      ref={wrapRef}
      className={[
        'relative flex items-stretch rounded-2xl border bg-white transition-colors',
        hasError ? 'border-red-400 ring-2 ring-red-100' : 'border-line focus-within:border-brand focus-within:ring-2 focus-within:ring-brand-ring',
      ].join(' ')}
    >
      <button
        type="button"
        className="flex items-center gap-2 rounded-l-2xl border-r border-line px-3.5 py-3 text-sm font-medium text-ink hover:bg-brand-soft/40"
        onClick={() => setOpen(o => !o)}
        aria-label="Select country code"
        aria-expanded={open}
      >
        <span aria-hidden="true" className="text-base">{selectedCountry.flag}</span>
        <span className="font-semibold tabular-nums">{selectedCountry.dial}</span>
        <span aria-hidden="true" className={`text-ink-muted transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>

      <input
        ref={inputRef}
        type="tel"
        className="flex-1 rounded-r-2xl bg-transparent px-3.5 py-3 text-base text-ink placeholder:text-ink-muted/70 focus:outline-none"
        placeholder={countryCode === 'IN' ? '9876543210' : 'Phone number'}
        value={value}
        onChange={e => onValueChange(e.target.value.replace(/\D/g, ''))}
        onBlur={onBlur}
        inputMode="numeric"
        autoComplete="tel-national"
        aria-label="Phone number"
      />

      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 max-h-[320px] overflow-hidden rounded-2xl border border-line bg-white shadow-card">
          <div className="border-b border-line p-2.5">
            <input
              type="text"
              placeholder="Search country..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
              aria-label="Search country"
              className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-muted/70 focus:border-brand focus:outline-none"
            />
          </div>
          <div className="max-h-[240px] overflow-y-auto" role="listbox">
            {filtered.map(country => (
              <button
                type="button"
                key={country.code}
                role="option"
                aria-selected={country.code === countryCode}
                className={[
                  'flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-brand-soft/50',
                  country.code === countryCode ? 'bg-brand-soft/70 font-semibold text-brand-deep' : 'text-ink',
                ].join(' ')}
                onClick={() => {
                  onCountryChange(country.code);
                  setOpen(false);
                  setSearch('');
                  inputRef.current?.focus();
                }}
              >
                <span aria-hidden="true" className="text-base">{country.flag}</span>
                <span className="flex-1">{country.name}</span>
                <span className="font-medium text-ink-muted tabular-nums">{country.dial}</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="px-3 py-4 text-center text-sm text-ink-muted">No results</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Field components ─────────────────────────────────────────────────────────

interface FieldProps {
  id: keyof FormFields;
  label: string;
  type?: string;
  placeholder: string;
  value: string;
  error?: string;
  touched: boolean;
  onChange: (v: string) => void;
  onBlur: () => void;
  autoComplete?: string;
  inputMode?: 'text' | 'email' | 'numeric';
}

function Field({
  id, label, type = 'text', placeholder, value, error, touched, onChange, onBlur,
  autoComplete, inputMode,
}: FieldProps) {
  const hasError = touched && !!error;
  const isValid = touched && !error && value.trim().length > 0;
  return (
    <div id={`field-${id}`} className="flex flex-col">
      <label htmlFor={id} className="mb-1.5 text-sm font-semibold text-ink">
        {label} <span className="text-brand">*</span>
      </label>
      <input
        id={id}
        name={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        onBlur={onBlur}
        autoComplete={autoComplete}
        inputMode={inputMode}
        aria-describedby={hasError ? `err-${id}` : undefined}
        aria-invalid={hasError}
        className={[
          'w-full rounded-2xl border bg-white px-4 py-3 text-base text-ink placeholder:text-ink-muted/70 transition-colors focus:outline-none',
          hasError
            ? 'border-red-400 ring-2 ring-red-100'
            : isValid
              ? 'border-brand/40'
              : 'border-line focus:border-brand focus:ring-2 focus:ring-brand-ring',
        ].join(' ')}
      />
      <span
        id={`err-${id}`}
        role="alert"
        className={['mt-1 text-xs text-red-600 transition-opacity', hasError ? 'opacity-100' : 'opacity-0'].join(' ')}
      >
        {error ?? ' '}
      </span>
    </div>
  );
}

// ── Order Summary (driven by parent state) ───────────────────────────────────

interface OrderSummaryProps {
  finalRupees: number;
  appliedCoupon: CouponSuccess | null;
}

const VALUE_BULLETS = [
  `${CHECKOUT_CONFIG.challenge.days} days of live physio-led prenatal sessions on Zoom`,
  'Labor breathing + pelvic floor + posture corrections',
  `${CHECKOUT_CONFIG.challenge.timeSlotList.length} daily slots — ${CHECKOUT_CONFIG.challenge.timeSlots}`,
];

function OrderSummary({ finalRupees, appliedCoupon }: OrderSummaryProps) {
  const original = CHECKOUT_CONFIG.amountRupeesNumeric;
  const discountAmount = original - finalRupees;
  return (
    <aside
      aria-label="Order summary"
      className="order-1 rounded-3xl bg-white p-5 shadow-card ring-1 ring-line sm:p-6 md:p-7 lg:order-2 lg:sticky lg:top-24"
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-deep">
        Order Summary
      </p>
      <h2 className="mt-2 font-heading text-xl font-bold leading-snug text-ink sm:text-2xl">
        {CHECKOUT_CONFIG.challenge.brandName}
      </h2>
      <div className="mt-3 inline-flex items-center gap-2 rounded-pill bg-brand-soft px-3 py-1.5 text-xs font-medium text-brand-deep">
        <Clock weight="fill" size={12} aria-hidden="true" className="text-brand-deep" />
        Live · Starts {CHECKOUT_CONFIG.challenge.startDate} · {CHECKOUT_CONFIG.challenge.timeSlots}
      </div>

      <div className="my-5 h-px bg-line" />

      <ul className="space-y-3">
        {VALUE_BULLETS.map(b => (
          <li key={b} className="flex items-start gap-2.5 text-[15px] text-ink-soft">
            <span
              aria-hidden="true"
              className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-soft text-brand-deep"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </span>
            {b}
          </li>
        ))}
      </ul>

      <div className="my-5 h-px bg-line" />

      {appliedCoupon && (
        <div className="mb-4 flex items-start gap-2 rounded-2xl border border-green-200 bg-green-50 p-3 text-sm">
          <span aria-hidden="true" className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-green-600 text-white">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </span>
          <div>
            <p className="font-semibold text-green-800">
              Coupon <span className="font-mono uppercase">{appliedCoupon.code}</span> applied
            </p>
            <p className="text-xs text-green-700">
              {appliedCoupon.discountReason} · You save ₹{discountAmount}
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-baseline gap-3">
        <span className="font-heading text-4xl font-extrabold text-ink">
          {finalRupees === 0 ? 'FREE' : `₹${finalRupees}`}
        </span>
        {finalRupees < original && (
          <s className="text-lg text-ink-muted">₹{original}</s>
        )}
        <span className="ml-auto inline-flex items-center gap-1 rounded-pill bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand-deep">
          {finalRupees === 0 ? '100% OFF' : finalRupees < original ? `Save ₹${discountAmount}` : 'Best price'}
        </span>
      </div>
      <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-ink-soft">
        <ShieldCheck weight="fill" size={14} aria-hidden="true" className="text-brand-deep" />
        100% Money-Back Guarantee — refunded instantly if you don&apos;t love it.
      </p>

      <div className="mt-5 flex items-center gap-3 rounded-2xl bg-cream-fade p-3 ring-1 ring-line">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-brand-gradient font-heading text-sm font-extrabold text-white">
          A
        </div>
        <p className="text-[13px] leading-tight text-ink-soft">
          <strong className="block font-heading text-sm font-bold text-ink">Dr. Ankita</strong>
          Women&apos;s Health Physio · Your coach for this challenge
        </p>
      </div>
    </aside>
  );
}

// ── Main CheckoutForm ────────────────────────────────────────────────────────

export default function CheckoutForm() {
  const router = useRouter();

  const [fields, setFields] = useState<FormFields>({
    firstName: '', lastName: '', email: '', city: '', phone: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<keyof FormFields, boolean>>({
    firstName: false, lastName: false, email: false, city: false, phone: false,
  });
  const [countryCode, setCountryCode] = useState('IN');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Coupon state ──
  const [couponInput, setCouponInput] = useState('');
  const [couponOpen, setCouponOpen] = useState(false);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<CouponSuccess | null>(null);

  const finalRupees = appliedCoupon
    ? appliedCoupon.finalAmountRupeesNumeric
    : CHECKOUT_CONFIG.amountRupeesNumeric;

  useEffect(() => {
    // If checkout was opened directly with utm_* in the URL, persist them to
    // the cookie too. (Landing page <UtmCapture/> handles the normal case.)
    const urlUtm = readUtmFromUrl(window.location.search);
    writeUtmCookie(urlUtm);
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 5000);
  }, []);

  const dismissToast = () => {
    setToast(null);
    if (toastTimer.current) clearTimeout(toastTimer.current);
  };

  function handleChange(field: keyof FormFields, value: string) {
    setFields(f => ({ ...f, [field]: value }));
    if (touched[field]) {
      const updated = { ...fields, [field]: value };
      const newErrors = validateFields(updated, countryCode);
      setErrors(e => ({ ...e, [field]: newErrors[field] }));
    }
  }

  function handleBlur(field: keyof FormFields) {
    setTouched(t => ({ ...t, [field]: true }));
    const newErrors = validateFields(fields, countryCode);
    setErrors(e => ({ ...e, [field]: newErrors[field] }));
  }

  function handlePhoneBlur() {
    setTouched(t => ({ ...t, phone: true }));
    const newErrors = validateFields(fields, countryCode);
    setErrors(e => ({ ...e, phone: newErrors.phone }));
  }

  // ── Coupon apply: validates server-side via create-order's coupon branch ──
  // The server is the source of truth. We do a "dry" call here so the user sees
  // the discount in the summary before submitting. The real order is created
  // on submit. NOTE: this means create-order is hit twice for coupon flows —
  // acceptable trade-off for clear UX.
  async function handleApplyCoupon() {
    const code = couponInput.trim();
    if (!code) {
      setCouponError('Enter a coupon code.');
      return;
    }
    setCouponLoading(true);
    setCouponError(null);
    try {
      const res = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ couponCode: code }),
      });
      if (!res.ok) throw new Error('Could not validate coupon. Try again.');
      const json: { coupon?: CouponResult } = await res.json();
      const coupon = json.coupon;
      if (coupon && coupon.ok) {
        setAppliedCoupon(coupon);
        setCouponError(null);
      } else {
        setAppliedCoupon(null);
        setCouponError(coupon && 'error' in coupon ? coupon.error : 'Coupon code not valid.');
      }
    } catch (err) {
      setAppliedCoupon(null);
      setCouponError(err instanceof Error ? err.message : 'Could not validate coupon.');
    } finally {
      setCouponLoading(false);
    }
  }

  function handleRemoveCoupon() {
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setTouched({ firstName: true, lastName: true, email: true, city: true, phone: true });
    const allErrors = validateFields(fields, countryCode);
    setErrors(allErrors);

    if (Object.keys(allErrors).length > 0) {
      const firstErrorKey = Object.keys(allErrors)[0] as keyof FormFields;
      document.getElementById(`field-${firstErrorKey}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setLoading(true);

    try {
      const orderRes = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ couponCode: appliedCoupon?.code ?? '' }),
      });

      if (!orderRes.ok) {
        const err = await orderRes.json();
        throw new Error(err.error ?? 'Could not initiate payment.');
      }

      const { orderId, keyId, amount, currency, coupon, freeOrder, freeOrderToken } =
        await orderRes.json() as {
          orderId: string;
          keyId: string;
          amount: number;
          currency: string;
          coupon: CouponResult | null;
          freeOrder?: boolean;
          freeOrderToken?: string;
        };

      // Defensive: if the user manually crafted a coupon that became invalid
      // between apply & submit, surface that without proceeding to the modal.
      if (appliedCoupon && (!coupon || !coupon.ok)) {
        throw new Error('Coupon is no longer valid. Please remove it and try again.');
      }

      const selectedCountry = COUNTRIES.find(c => c.code === countryCode) ?? COUNTRIES[0];

      // ── Free-order branch — skip Razorpay modal entirely ─────────────────
      if (freeOrder && freeOrderToken && coupon?.ok) {
        await handleFreeOrderSuccess({
          orderId,
          freeOrderToken,
          couponCode: coupon.code,
          dialCode: selectedCountry.dial,
        });
        return;
      }

      if (typeof window.Razorpay === 'undefined') {
        throw new Error('Payment system unavailable. Please refresh and try again.');
      }

      const rzp = new window.Razorpay({
        key: keyId ?? process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? '',
        amount,
        currency,
        order_id: orderId,
        name: CHECKOUT_CONFIG.razorpayModal.name,
        description: CHECKOUT_CONFIG.razorpayModal.description,
        prefill: {
          name: `${fields.firstName.trim()} ${fields.lastName.trim()}`,
          email: fields.email.trim(),
          contact: `${selectedCountry.dial}${fields.phone.trim()}`,
        },
        theme: { color: CHECKOUT_CONFIG.razorpayModal.themeColor },
        handler: async (response) => {
          await handlePaymentSuccess(response, selectedCountry.dial);
        },
        modal: {
          ondismiss: () => setLoading(false),
        },
      });

      rzp.open();
    } catch (err) {
      setLoading(false);
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      showToast(msg);
    }
  }

  async function handleFreeOrderSuccess(params: {
    orderId: string;
    freeOrderToken: string;
    couponCode: string;
    dialCode: string;
  }) {
    try {
      const utm = readUtmCookie();
      const verifyRes = await fetch('/api/razorpay/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: params.orderId,
          freeOrderToken: params.freeOrderToken,
          couponCode: params.couponCode,
          customer: {
            firstName: fields.firstName.trim(),
            lastName: fields.lastName.trim(),
            email: fields.email.trim(),
            city: fields.city.trim(),
            phone: fields.phone.trim(),
            countryCode,
            dialCode: params.dialCode,
          },
          utm,
        }),
      });

      const result = await verifyRes.json();
      if (!result.success) {
        throw new Error(result.error ?? 'Free registration failed.');
      }

      const tyParams = new URLSearchParams({ funnel: CHECKOUT_CONFIG.funnelSlug });
      if (utm.source)   tyParams.set('utm_source',   utm.source);
      if (utm.medium)   tyParams.set('utm_medium',   utm.medium);
      if (utm.campaign) tyParams.set('utm_campaign', utm.campaign);
      if (utm.content)  tyParams.set('utm_content',  utm.content);
      if (utm.term)     tyParams.set('utm_term',     utm.term);
      if (utm.id)       tyParams.set('utm_id',       utm.id);
      tyParams.set('amt', '0');
      tyParams.set('cur', String(result.currency ?? CHECKOUT_CONFIG.currency));
      tyParams.set('free', '1');
      router.push(`${CHECKOUT_CONFIG.thankYouPath}?${tyParams.toString()}`);
    } catch (err) {
      setLoading(false);
      const msg = err instanceof Error ? err.message : 'Could not complete free registration.';
      showToast(msg);
    }
  }

  async function handlePaymentSuccess(response: RazorpayResponse, dialCode: string) {
    try {
      const utm = readUtmCookie();

      const verifyRes = await fetch('/api/razorpay/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: response.razorpay_order_id,
          paymentId: response.razorpay_payment_id,
          signature: response.razorpay_signature,
          customer: {
            firstName: fields.firstName.trim(),
            lastName: fields.lastName.trim(),
            email: fields.email.trim(),
            city: fields.city.trim(),
            phone: fields.phone.trim(),
            countryCode,
            dialCode,
          },
          utm,
        }),
      });

      const result = await verifyRes.json();

      if (!result.success) {
        throw new Error(result.error ?? 'Payment verification failed.');
      }

      const tyParams = new URLSearchParams({ funnel: CHECKOUT_CONFIG.funnelSlug });
      if (utm.source)   tyParams.set('utm_source',   utm.source);
      if (utm.medium)   tyParams.set('utm_medium',   utm.medium);
      if (utm.campaign) tyParams.set('utm_campaign', utm.campaign);
      if (utm.content)  tyParams.set('utm_content',  utm.content);
      if (utm.term)     tyParams.set('utm_term',     utm.term);
      if (utm.id)       tyParams.set('utm_id',       utm.id);
      if (result.amount)   tyParams.set('amt', String(result.amount));
      if (result.currency) tyParams.set('cur', String(result.currency));
      router.push(`${CHECKOUT_CONFIG.thankYouPath}?${tyParams.toString()}`);
    } catch (err) {
      setLoading(false);
      const msg = err instanceof Error
        ? err.message
        : 'Payment received but verification failed. Please contact us.';
      showToast(msg);
    }
  }

  return (
    <>
      {/* Toast */}
      {toast && (
        <div
          role="alert"
          className="fixed bottom-6 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-start gap-3 rounded-2xl bg-ink px-4 py-3 text-sm text-white shadow-card"
        >
          <span className="flex-1">{toast}</span>
          <button
            onClick={dismissToast}
            aria-label="Dismiss"
            className="shrink-0 rounded-full p-1 text-white/70 hover:text-white"
          >
            <X weight="bold" size={14} aria-hidden="true" />
          </button>
        </div>
      )}

      <div className="grid gap-6 sm:gap-8 lg:grid-cols-[1.4fr_1fr] lg:gap-10">
        {/* ── Left on desktop / Form (rendered AFTER summary on mobile via order) ── */}
        <div className="order-2 rounded-3xl bg-white p-5 shadow-card ring-1 ring-line sm:p-6 md:p-8 lg:order-1">
          <div className="bw-chip mb-3">
            <Lock weight="fill" size={14} aria-hidden="true" className="text-brand-deep" />
            Secure Registration
          </div>
          <h1 className="font-heading text-2xl font-extrabold leading-tight text-ink sm:text-3xl">
            Your Details
          </h1>
          <p className="mt-1.5 text-sm text-ink-soft">
            One step away from the 3-Day Prenatal Challenge.
          </p>

          <form onSubmit={handleSubmit} noValidate className="mt-6">
            <div className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  id="firstName"
                  label="First Name"
                  placeholder="Priya"
                  value={fields.firstName}
                  error={errors.firstName}
                  touched={touched.firstName}
                  onChange={v => handleChange('firstName', v)}
                  onBlur={() => handleBlur('firstName')}
                  autoComplete="given-name"
                />
                <Field
                  id="lastName"
                  label="Last Name"
                  placeholder="Sharma"
                  value={fields.lastName}
                  error={errors.lastName}
                  touched={touched.lastName}
                  onChange={v => handleChange('lastName', v)}
                  onBlur={() => handleBlur('lastName')}
                  autoComplete="family-name"
                />
              </div>

              <Field
                id="email"
                label="Email Address"
                type="email"
                placeholder="priya@example.com"
                value={fields.email}
                error={errors.email}
                touched={touched.email}
                onChange={v => handleChange('email', v)}
                onBlur={() => handleBlur('email')}
                autoComplete="email"
                inputMode="email"
              />

              <Field
                id="city"
                label="City"
                placeholder="Mumbai"
                value={fields.city}
                error={errors.city}
                touched={touched.city}
                onChange={v => handleChange('city', v)}
                onBlur={() => handleBlur('city')}
                autoComplete="address-level2"
              />

              <div id="field-phone" className="flex flex-col">
                <label htmlFor="phone" className="mb-1.5 text-sm font-semibold text-ink">
                  Phone Number <span className="text-brand">*</span>
                </label>
                <CheckoutPhoneInput
                  value={fields.phone}
                  countryCode={countryCode}
                  onValueChange={v => handleChange('phone', v)}
                  onCountryChange={code => {
                    setCountryCode(code);
                    if (touched.phone) {
                      const newErrors = validateFields({ ...fields }, code);
                      setErrors(e => ({ ...e, phone: newErrors.phone }));
                    }
                  }}
                  error={errors.phone}
                  touched={touched.phone}
                  onBlur={handlePhoneBlur}
                />
                <span
                  id="err-phone"
                  role="alert"
                  className={['mt-1 text-xs text-red-600 transition-opacity', touched.phone && !!errors.phone ? 'opacity-100' : 'opacity-0'].join(' ')}
                >
                  {errors.phone ?? ' '}
                </span>
              </div>

              {/* ── Coupon section ── */}
              <div className="rounded-2xl border border-line bg-cream-fade p-4">
                {!appliedCoupon ? (
                  !couponOpen ? (
                    <button
                      type="button"
                      onClick={() => setCouponOpen(true)}
                      className="flex items-center gap-2 text-sm font-semibold text-brand hover:text-brand-deep"
                    >
                      <Tag weight="fill" size={14} aria-hidden="true" className="text-brand-deep" />
                      Have a coupon code?
                    </button>
                  ) : (
                    <div>
                      <label htmlFor="coupon" className="mb-1.5 block text-sm font-semibold text-ink">
                        Coupon code
                      </label>
                      <div className="flex gap-2">
                        <input
                          id="coupon"
                          type="text"
                          value={couponInput}
                          onChange={e => {
                            setCouponInput(e.target.value);
                            if (couponError) setCouponError(null);
                          }}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              void handleApplyCoupon();
                            }
                          }}
                          placeholder="Enter code"
                          aria-invalid={!!couponError}
                          className={[
                            'flex-1 rounded-2xl border bg-white px-4 py-3 text-base uppercase tracking-wider text-ink placeholder:text-ink-muted/60 placeholder:normal-case focus:outline-none focus:ring-2 focus:ring-brand-ring',
                            couponError ? 'border-red-400' : 'border-line focus:border-brand',
                          ].join(' ')}
                        />
                        <button
                          type="button"
                          onClick={handleApplyCoupon}
                          disabled={couponLoading || !couponInput.trim()}
                          className="rounded-2xl bg-ink px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {couponLoading ? 'Checking…' : 'Apply'}
                        </button>
                      </div>
                      {couponError && (
                        <p className="mt-2 text-xs font-medium text-red-600" role="alert">
                          {couponError}
                        </p>
                      )}
                    </div>
                  )
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <span aria-hidden="true" className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-green-600 text-white">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-ink">
                          <span className="font-mono uppercase">{appliedCoupon.code}</span> applied
                        </p>
                        <p className="text-xs text-ink-soft">
                          New price:{' '}
                          <strong className="text-ink">
                            {appliedCoupon.finalAmountRupeesNumeric === 0
                              ? 'FREE'
                              : `₹${appliedCoupon.finalAmountRupeesNumeric}`}
                          </strong>{' '}
                          ({appliedCoupon.discountReason})
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      className="shrink-0 text-xs font-semibold text-ink-soft underline-offset-2 hover:text-brand hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-7">
              <button
                type="submit"
                disabled={loading}
                aria-busy={loading}
                className="bw-cta w-full text-base sm:text-[17px]"
              >
                {loading ? (
                  <>
                    <Spinner /> Processing…
                  </>
                ) : finalRupees === 0 ? (
                  <>
                    Complete Free Registration
                    <ArrowRight />
                  </>
                ) : (
                  <>
                    Pay ₹{finalRupees} Securely
                    <ArrowRight />
                  </>
                )}
              </button>

              <div className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-ink-muted">
                <span className="inline-flex items-center gap-1">
                  <Lock weight="fill" size={11} aria-hidden="true" className="text-brand-deep" />
                  Razorpay Secured
                </span>
                <span aria-hidden="true">·</span>
                <span>SSL Encrypted</span>
                <span aria-hidden="true">·</span>
                <span>Instant Refund Guarantee</span>
              </div>

              {/* Premium payment-method logo strip */}
              <div className="mt-4 rounded-2xl bg-cream-fade p-3 ring-1 ring-line">
                <PaymentLogos size="full" />
              </div>
            </div>
          </form>
        </div>

        {/* ── Right: Summary ── */}
        <OrderSummary finalRupees={finalRupees} appliedCoupon={appliedCoupon} />
      </div>
    </>
  );
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function ArrowRight() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
