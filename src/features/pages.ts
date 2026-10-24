import { api } from "../services/http";

export interface ContentPage { slug: string; title: string; content: string; versionNumber: number; publishedAt: string }
export const pagesService = { get(slug: string) { return api.request<ContentPage>(`/api/pages/${slug}`, { refreshOnUnauthorized: false }); }, publish(slug: string, title: string, content: string) { return api.request<ContentPage>(`/api/pages/${slug}`, { method: "PUT", body: { title, content } }); } };
