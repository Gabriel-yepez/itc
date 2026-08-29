import type { Metadata } from "next";
import { seo } from "@/lib/seo";
import type { CmsSeo } from "./types";

export function buildMetadata(cms: CmsSeo | null, canonicalFallback: string): Metadata {
  const title = cms?.metaTitle ?? seo.title.default;
  const description = cms?.metaDescription ?? seo.description;
  const canonical = cms?.canonicalURL ?? canonicalFallback;

  return {
    title,
    description,
    // El CMS guarda las keywords como una cadena separada por comas.
    keywords: cms?.keywords?.split(",").map((k) => k.trim()).filter(Boolean) ?? seo.keywords,
    alternates: { canonical },
    openGraph: { ...seo.openGraph, title, description, url: `${seo.siteUrl}${canonical}` },
    twitter: { ...seo.twitter, title, description },
  };
}
