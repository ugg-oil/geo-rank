"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import {
  leadErrorFromStatus,
  parseLeadInput,
  type LeadErrorCode,
  type LeadIntent,
} from "@/lib/leads";
import { useI18n } from "@/lib/i18n/use-i18n";

type Props = {
  sourcePath: string;
};

export function LeadForm({ sourcePath }: Props) {
  const { m } = useI18n();
  const titleId = useId();
  const openButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [brandName, setBrandName] = useState("");
  const [website, setWebsite] = useState("");
  const [message, setMessage] = useState("");
  const [intent, setIntent] = useState<LeadIntent>("track_brand");
  const [consent, setConsent] = useState(false);
  const [companyUrl, setCompanyUrl] = useState(""); // honeypot
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function messageFor(code: LeadErrorCode) {
    return m.lead.errors[code] ?? m.lead.errorGeneric;
  }

  function close() {
    setOpen(false);
    setError(null);
  }

  function openDialog() {
    setSuccess(false);
    setError(null);
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    dialogRef.current?.querySelector<HTMLElement>("input,button,textarea")?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      openButtonRef.current?.focus();
    };
  }, [open]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const local = parseLeadInput({
      email,
      brandName,
      website: website || undefined,
      message: message || undefined,
      intent,
      consent,
      sourcePath,
      companyUrl,
    });
    if (!local.ok) {
      setError(messageFor(local.code));
      setPending(false);
      return;
    }

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          brandName,
          website: website || undefined,
          message: message || undefined,
          intent,
          consent,
          sourcePath,
          companyUrl,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        code?: string;
      };
      if (!response.ok) {
        setError(messageFor(leadErrorFromStatus(response.status, payload.code)));
        return;
      }
      setSuccess(true);
      setEmail("");
      setWebsite("");
      setMessage("");
      setConsent(false);
      setCompanyUrl("");
    } catch {
      setError(messageFor("network"));
    } finally {
      setPending(false);
    }
  }

  const fieldClass =
    "mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] outline-none transition-colors focus:border-[var(--border-hover)]";

  return (
    <>
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 text-center">
        <p className="text-sm font-medium text-[var(--text)]">{m.brand.ctaTitle}</p>
        <p className="mt-1 text-xs text-[var(--text-muted)]">{m.brand.ctaDesc}</p>
        <button
          ref={openButtonRef}
          type="button"
          onClick={openDialog}
          className="mt-3 inline-flex items-center rounded-lg bg-[var(--cta-bg)] px-4 py-2 text-sm font-medium text-[var(--cta-text)] transition-opacity hover:opacity-90"
        >
          {m.brand.ctaButton}
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          onClick={close}
          role="presentation"
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-lg sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 id={titleId} className="text-sm font-medium text-[var(--text)]">
                  {m.lead.title}
                </h2>
                <p className="mt-1 text-xs text-[var(--text-muted)]">{m.lead.desc}</p>
              </div>
              <button
                type="button"
                onClick={close}
                className="rounded-md px-2 py-1 text-sm text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-elevated)] hover:text-[var(--text)]"
                aria-label={m.lead.close}
              >
                ×
              </button>
            </div>

            {success ? (
              <div className="space-y-4">
                <p className="text-sm text-[var(--green)]">{m.lead.success}</p>
                <button
                  type="button"
                  onClick={close}
                  className="inline-flex items-center rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text)] transition-colors hover:border-[var(--border-hover)]"
                >
                  {m.lead.close}
                </button>
              </div>
            ) : (
              <form className="relative space-y-3 text-left" onSubmit={onSubmit}>
                <label className="block text-xs text-[var(--text-muted)]">
                  {m.lead.email}
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={fieldClass}
                  />
                </label>
                <label className="block text-xs text-[var(--text-muted)]">
                  {m.lead.brandName}
                  <input
                    type="text"
                    required
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    className={fieldClass}
                  />
                </label>
                <fieldset>
                  <legend className="text-xs text-[var(--text-muted)]">{m.lead.intentLabel}</legend>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(
                      [
                        ["track_brand", m.lead.intentTrack],
                        ["geo_audit", m.lead.intentAudit],
                      ] as const
                    ).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setIntent(value)}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                          intent === value
                            ? "border-[var(--text)] bg-[var(--cta-bg)] text-[var(--cta-text)]"
                            : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-hover)]"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <label className="block text-xs text-[var(--text-muted)]">
                  {m.lead.website}
                  <input
                    type="text"
                    inputMode="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    className={fieldClass}
                    placeholder="https://"
                  />
                </label>
                <label className="block text-xs text-[var(--text-muted)]">
                  {m.lead.message}
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    maxLength={500}
                    rows={3}
                    className={fieldClass}
                  />
                </label>
                <label className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden>
                  Company URL
                  <input
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={companyUrl}
                    onChange={(e) => setCompanyUrl(e.target.value)}
                  />
                </label>
                <label className="flex items-start gap-2 text-xs text-[var(--text-secondary)]">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-0.5"
                    required
                  />
                  <span>{m.lead.consent}</span>
                </label>
                {error && (
                  <p className="rounded-lg border border-[var(--red)]/30 bg-[var(--red)]/5 px-3 py-2 text-xs text-[var(--red)]" role="alert">
                    {error}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={pending}
                  className="inline-flex items-center rounded-lg bg-[var(--cta-bg)] px-4 py-2 text-sm font-medium text-[var(--cta-text)] transition-opacity disabled:opacity-60"
                >
                  {pending ? m.lead.submitting : m.lead.submit}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
