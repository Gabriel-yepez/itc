"use client";

import { useState } from "react";
import type { CmsInquiryOption } from "@/lib/cms/types";

const defaultInquiryOptions: CmsInquiryOption[] = [
  { id: 1, label: "Desarrollo de Software a Medida", value: "Desarrollo de Software a Medida", isDefault: true },
  { id: 2, label: "Auditoría de Seguridad & Zero-Trust", value: "Auditoría de Seguridad & Zero-Trust", isDefault: false },
  { id: 3, label: "Arquitectura Cloud & DevOps", value: "Arquitectura Cloud & DevOps", isDefault: false },
  { id: 4, label: "Aplicaciones Móviles & Web", value: "Aplicaciones Móviles & Web", isDefault: false },
  { id: 5, label: "Consulta General", value: "Consulta General", isDefault: false },
];

export default function ContactForm({
  inquiryOptions,
  submitLabel,
  successTitle,
  successMessage,
}: {
  inquiryOptions?: CmsInquiryOption[];
  submitLabel?: string | null;
  successTitle?: string | null;
  successMessage?: string | null;
}) {
  const options =
    inquiryOptions && inquiryOptions.length > 0
      ? inquiryOptions
      : defaultInquiryOptions;

  const defaultOption =
    options.find((opt) => opt.isDefault)?.value ?? options[0]?.value ?? "";

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: defaultOption,
    message: "",
    website: "", // Honeypot
  });

  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage(null);

    const cmsUrl = process.env.NEXT_PUBLIC_CMS_URL ?? "http://localhost:1337";

    try {
      const res = await fetch(`${cmsUrl}/api/contact-submissions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          data: {
            name: formData.name,
            email: formData.email,
            subject: formData.subject,
            message: formData.message,
            source: "/contacto",
            website: formData.website,
          },
        }),
      });

      if (res.status === 201 || res.status === 200) {
        setStatus("success");
        return;
      }

      const data = await res.json().catch(() => null);

      if (res.status === 400 || res.status === 429) {
        const msg =
          data?.error?.message ??
          (res.status === 429
            ? "Has superado el límite de envíos permitidos. Por favor, intenta de nuevo más tarde."
            : "Por favor revisa los datos ingresados.");
        setErrorMessage(msg);
        setStatus("idle");
        return;
      }

      setErrorMessage(
        "No se pudo enviar el mensaje debido a un problema técnico. Por favor, intenta más tarde o contáctanos por correo.",
      );
      setStatus("idle");
    } catch {
      setErrorMessage(
        "No se pudo conectar con el servidor. Por favor, verifica tu conexión o intenta más tarde.",
      );
      setStatus("idle");
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  if (status === "success") {
    return (
      <div className="rounded-2xl border border-secondary/30 bg-secondary/10 p-8 text-center animate-fadeIn">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-white">
          <svg
            className="h-7 w-7"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2.5"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="font-headline text-2xl font-bold text-black mb-2">
          {successTitle ?? "¡Mensaje recibido con éxito!"}
        </h3>
        <p className="font-body text-base text-black max-w-md mx-auto mb-6">
          {successMessage ??
            "Gracias por contactar con Itc Services. Nuestro equipo de ingenieros revisará tus requerimientos y te responderá en menos de 24 horas."}
        </p>
        <button
          type="button"
          onClick={() => {
            setFormData({
              name: "",
              email: "",
              subject: defaultOption,
              message: "",
              website: "",
            });
            setStatus("idle");
            setErrorMessage(null);
          }}
          className="rounded-xl border border-neutral bg-white px-6 py-2.5 font-body text-sm font-semibold text-black hover:bg-neutral/50 transition-colors cursor-pointer"
        >
          Enviar otro mensaje
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errorMessage && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 font-body text-sm text-red-800"
        >
          {errorMessage}
        </div>
      )}

      {/* Honeypot field (hidden offscreen from human users) */}
      <div
        className="absolute left-[-9999px] top-[-9999px] h-0 w-0 overflow-hidden opacity-0 pointer-events-none"
        aria-hidden="true"
      >
        <label htmlFor="website-field">Website (do not fill)</label>
        <input
          type="text"
          id="website-field"
          name="website"
          value={formData.website}
          onChange={handleChange}
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      {/* Name Field */}
      <div className="flex flex-col space-y-2">
        <label
          htmlFor="name"
          className="font-label text-xs font-bold uppercase tracking-wider text-black"
        >
          Nombre Completo
        </label>
        <input
          type="text"
          id="name"
          name="name"
          required
          value={formData.name}
          onChange={handleChange}
          placeholder="Ej. Alexander Hamilton"
          className="w-full rounded-xl border border-neutral bg-neutral/20 p-3.5 font-body text-base text-black placeholder:text-black/40 focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
        />
      </div>

      {/* Email Field */}
      <div className="flex flex-col space-y-2">
        <label
          htmlFor="email"
          className="font-label text-xs font-bold uppercase tracking-wider text-black"
        >
          Correo Corporativo
        </label>
        <input
          type="email"
          id="email"
          name="email"
          required
          value={formData.email}
          onChange={handleChange}
          placeholder="alexander@empresa.com"
          className="w-full rounded-xl border border-neutral bg-neutral/20 p-3.5 font-body text-base text-black placeholder:text-black/40 focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
        />
      </div>

      {/* Subject Dropdown */}
      <div className="flex flex-col space-y-2">
        <label
          htmlFor="subject"
          className="font-label text-xs font-bold uppercase tracking-wider text-black"
        >
          Tipo de Consulta
        </label>
        <div className="relative">
          <select
            id="subject"
            name="subject"
            value={formData.subject}
            onChange={handleChange}
            className="w-full appearance-none rounded-xl border border-neutral bg-neutral/20 p-3.5 font-body text-base text-black focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
          >
            {options.map((opt) => (
              <option key={opt.id || opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-black">
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Message Field */}
      <div className="flex flex-col space-y-2">
        <label
          htmlFor="message"
          className="font-label text-xs font-bold uppercase tracking-wider text-black"
        >
          Detalles del Proyecto
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={5}
          value={formData.message}
          onChange={handleChange}
          placeholder="Describe brevemente los requerimientos técnicos o el alcance de tu proyecto..."
          className="w-full resize-none rounded-xl border border-neutral bg-neutral/20 p-3.5 font-body text-base text-black placeholder:text-black/40 focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
        />
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={status === "submitting"}
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-8 py-4 font-body text-base font-semibold text-white shadow-sm transition-all hover:opacity-90 disabled:opacity-50 cursor-pointer"
      >
        <span>
          {status === "submitting"
            ? "Enviando..."
            : submitLabel ?? "Enviar Mensaje"}
        </span>
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2.5"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
        </svg>
      </button>
    </form>
  );
}
