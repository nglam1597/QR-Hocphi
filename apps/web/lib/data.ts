import db from "../data/records.json";
import { RECEIVE } from "./config";

export interface PersonRecord {
  org: string;
  content: string;
  photoUrl: string;
  data: Record<string, string>;
}

export interface OrgInfo {
  code: string;
  name: string;
  count: number;
}

interface DB {
  generatedAt: string;
  columns: string[];
  orgs: Record<string, { name: string; count: number }>;
  records: Record<string, PersonRecord>;
}

const data = db as unknown as DB;

export const columns: string[] = data.columns ?? [];
export const generatedAt: string = data.generatedAt ?? "";
export const receive = RECEIVE;

export function getRecord(id: string): PersonRecord | null {
  return data.records[id] ?? null;
}

export function getAllIds(): string[] {
  return Object.keys(data.records);
}

export function getOrg(code: string): OrgInfo | null {
  const key = code.toUpperCase();
  const o = data.orgs[key];
  return o ? { code: key, ...o } : null;
}

export function listOrgs(): OrgInfo[] {
  return Object.entries(data.orgs).map(([code, v]) => ({ code, ...v }));
}
