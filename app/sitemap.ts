import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://bijbel-studie.com";
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${baseUrl}`, lastModified: new Date() },
    { url: `${baseUrl}/study`, lastModified: new Date() },
    { url: `${baseUrl}/community`, lastModified: new Date() },
    { url: `${baseUrl}/subscribe`, lastModified: new Date() },
    { url: `${baseUrl}/privacy-policy`, lastModified: new Date() },
    { url: `${baseUrl}/profile`, lastModified: new Date() },
    { url: `${baseUrl}/resources`, lastModified: new Date() },
    { url: `${baseUrl}/settings`, lastModified: new Date() },
    { url: `${baseUrl}/terms-of-service`, lastModified: new Date() },
    { url: `${baseUrl}/auth/signin`, lastModified: new Date() },
    { url: `${baseUrl}/auth/register`, lastModified: new Date() },
    { url: `${baseUrl}/help`, lastModified: new Date() },
    { url: `${baseUrl}/contact`, lastModified: new Date() },
    { url: `${baseUrl}/read`, lastModified: new Date() },
    { url: `${baseUrl}/plans`, lastModified: new Date() },
    { url: `${baseUrl}/notes`, lastModified: new Date() },
  ];

  return staticRoutes;
}
