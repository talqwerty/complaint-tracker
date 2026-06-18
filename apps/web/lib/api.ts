import { clearToken, getToken } from "@/lib/auth";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

export const STATUSES = ["Open", "In Progress", "Resolved", "Closed"] as const;
export const PRIORITIES = ["Critical", "High", "Medium", "Low"] as const;
export const CATEGORIES = [
  "สินค้าชำรุด",
  "บริการล่าช้า",
  "การเรียกเก็บเงิน",
  "คำถามด้านเทคนิค",
  "อื่นๆ",
] as const;

export type Status = (typeof STATUSES)[number];
export type Priority = (typeof PRIORITIES)[number];

export interface Note {
  id: number;
  caseId: number;
  author: string;
  content: string;
  createdAt: string;
}

export interface Attachment {
  id: number;
  caseId: number;
  key: string;
  filename: string;
  mimetype: string;
  size: number;
  createdAt: string;
  url: string | null;
}

export interface Case {
  id: number;
  caseNumber: string;
  customerName: string;
  customerContact: string | null;
  category: string;
  priority: string;
  subject: string;
  description: string | null;
  status: string;
  assignee: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CaseDetail extends Case {
  notes: Note[];
  attachments: Attachment[];
}

export interface Stats {
  total: number;
  byStatus: { status: string; count: number }[];
  byPriority: { priority: string; count: number }[];
}

export interface CreateCaseInput {
  customerName: string;
  customerContact?: string;
  category: string;
  priority?: string;
  subject: string;
  description?: string;
  assignee?: string;
}

export interface CaseFilters {
  status?: string;
  priority?: string;
  search?: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    cache: "no-store",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });

  // Expired/invalid token on a protected route → drop session, send to login.
  if (res.status === 401 && path !== "/auth/login") {
    clearToken();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.message) {
        message = Array.isArray(body.message)
          ? body.message.join(", ")
          : body.message;
      }
    } catch {
      // ignore non-JSON error bodies
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: string;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

export const api = {
  login(email: string, password: string): Promise<LoginResponse> {
    return request<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  me(): Promise<AuthUser> {
    return request<AuthUser>("/auth/me");
  },
  listCases(filters: CaseFilters = {}): Promise<Case[]> {
    const params = new URLSearchParams();
    if (filters.status && filters.status !== "All") params.set("status", filters.status);
    if (filters.priority && filters.priority !== "All") params.set("priority", filters.priority);
    if (filters.search) params.set("search", filters.search);
    const qs = params.toString();
    return request<Case[]>(`/cases${qs ? `?${qs}` : ""}`);
  },

  stats(): Promise<Stats> {
    return request<Stats>("/cases/stats");
  },

  getCase(id: number): Promise<CaseDetail> {
    return request<CaseDetail>(`/cases/${id}`);
  },

  createCase(input: CreateCaseInput): Promise<Case> {
    return request<Case>("/cases", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  updateCase(
    id: number,
    patch: Partial<Pick<Case, "status" | "assignee" | "priority" | "customerContact">>,
  ): Promise<Case> {
    return request<Case>(`/cases/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },

  addNote(id: number, note: { author: string; content: string }): Promise<Note> {
    return request<Note>(`/cases/${id}/notes`, {
      method: "POST",
      body: JSON.stringify(note),
    });
  },

  deleteCase(id: number): Promise<{ message: string }> {
    return request<{ message: string }>(`/cases/${id}`, { method: "DELETE" });
  },

  async uploadAttachment(caseId: number, file: File): Promise<Attachment> {
    const token = getToken();
    const form = new FormData();
    form.append("file", file);

    // Do NOT set Content-Type — the browser adds the multipart boundary.
    const res = await fetch(`${API_BASE}/cases/${caseId}/attachments`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });

    if (res.status === 401) {
      clearToken();
      if (typeof window !== "undefined") window.location.href = "/login";
    }
    if (!res.ok) {
      let message = `อัปโหลดไม่สำเร็จ (${res.status})`;
      try {
        const body = await res.json();
        if (body?.message) {
          message = Array.isArray(body.message) ? body.message.join(", ") : body.message;
        }
      } catch {
        // ignore non-JSON error bodies
      }
      throw new Error(message);
    }
    return res.json() as Promise<Attachment>;
  },

  deleteAttachment(caseId: number, attachmentId: number): Promise<{ message: string }> {
    return request<{ message: string }>(
      `/cases/${caseId}/attachments/${attachmentId}`,
      { method: "DELETE" },
    );
  },
};
