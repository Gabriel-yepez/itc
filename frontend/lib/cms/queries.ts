import { cacheLife, cacheTag } from "next/cache";
import { cmsFetch, cmsFetchMany } from "./client";
import type {
  Certification,
  Client,
  ContactPage,
  Global,
  HomePage,
  LegalPage,
  MethodologyStep,
  MethodologyTrack,
  Project,
  ProjectsPage,
  SecurityPage,
  Service,
  ServiceTrack,
  ServicesPage,
} from "./types";

export async function getGlobal(): Promise<Global | null> {
  "use cache";
  cacheLife("hourly");
  cacheTag("cms", "cms:global");
  return cmsFetch<Global>("/global");
}

export async function getHomePage(): Promise<HomePage | null> {
  "use cache";
  cacheLife("hourly");
  cacheTag("cms", "cms:home-page");
  return cmsFetch<HomePage>("/home-page");
}

export async function getServicesPage(): Promise<ServicesPage | null> {
  "use cache";
  cacheLife("hourly");
  cacheTag("cms", "cms:services-page");
  return cmsFetch<ServicesPage>("/services-page");
}

export async function getProjectsPage(): Promise<ProjectsPage | null> {
  "use cache";
  cacheLife("hourly");
  cacheTag("cms", "cms:projects-page");
  return cmsFetch<ProjectsPage>("/projects-page");
}

export async function getContactPage(): Promise<ContactPage | null> {
  "use cache";
  cacheLife("hourly");
  cacheTag("cms", "cms:contact-page");
  return cmsFetch<ContactPage>("/contact-page");
}

export async function getSecurityPage(): Promise<SecurityPage | null> {
  "use cache";
  cacheLife("hourly");
  cacheTag("cms", "cms:security-page");
  return cmsFetch<SecurityPage>("/security-page");
}

/** `track` forma parte de la clave de caché: cada pestaña cachea por separado. */
export async function getServices(track: ServiceTrack): Promise<Service[]> {
  "use cache";
  cacheLife("hourly");
  cacheTag("cms", "cms:services");
  return cmsFetchMany<Service>("/services", { filters: { track: { $eq: track } } });
}

export async function getProjects(): Promise<Project[]> {
  "use cache";
  cacheLife("hourly");
  cacheTag("cms", "cms:projects");
  return cmsFetchMany<Project>("/projects");
}

export async function getClients(): Promise<Client[]> {
  "use cache";
  cacheLife("hourly");
  cacheTag("cms", "cms:clients");
  return cmsFetchMany<Client>("/clients");
}

export async function getMethodologySteps(track: MethodologyTrack): Promise<MethodologyStep[]> {
  "use cache";
  cacheLife("hourly");
  cacheTag("cms", "cms:methodology-steps");
  return cmsFetchMany<MethodologyStep>("/methodology-steps", {
    filters: { track: { $eq: track } },
  });
}

export async function getCertifications(): Promise<Certification[]> {
  "use cache";
  cacheLife("hourly");
  cacheTag("cms", "cms:certifications");
  return cmsFetchMany<Certification>("/certifications");
}

export async function getLegalPage(slug: string): Promise<LegalPage | null> {
  "use cache";
  cacheLife("hourly");
  cacheTag("cms", "cms:legal-pages", `cms:legal-page:${slug}`);
  const rows = await cmsFetchMany<LegalPage>("/legal-pages", {
    filters: { slug: { $eq: slug } },
  });
  return rows[0] ?? null;
}
