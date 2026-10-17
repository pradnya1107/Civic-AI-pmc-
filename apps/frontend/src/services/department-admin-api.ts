import { ApiError, getApiBaseUrl } from "./auth-api";

export type DepartmentItem = {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  isActive: boolean;
};

export type DepartmentAdminItem = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  department: {
    id: string;
    name: string;
    slug: string;
  } | null;
  accountStatus: string;
  createdAt: string;
};

export type DepartmentDashboardData = {
  department: {
    id: string;
    name: string;
    slug: string;
  };
  counts: {
    total: number;
    pending: number;
    inProgress: number;
    resolved: number;
    rejected: number;
  };
};

export type DepartmentComplaintItem = {
  _id: string;
  complaintNumber: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  location?: {
    address: string;
    ward?: string;
  };
  createdAt: string;
  updatedAt: string;
};

export type CreateAdminResponse = {
  admin: DepartmentAdminItem;
  temporaryPassword?: string;
  confirmationOtp?: string;
};

export type AIAnalysisData = {
  _id?: string;
  complaintRef: string;
  suggestedCategory: string;
  suggestedPriority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  summary: string;
  confidence: number;
  modelVersion: string;
  createdAt: string;
  updatedAt: string;
};

async function apiCall<T>(
  path: string,
  options: {
    method?: "GET" | "POST" | "PATCH" | "DELETE";
    body?: unknown;
    token?: string;
  } = {},
): Promise<T> {
  const url = `${getApiBaseUrl()}${path}`;
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (options.body) {
    headers["Content-Type"] = "application/json";
  }

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: options.method ?? "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch (error) {
    throw new ApiError(
      error instanceof Error ? error.message : "Network connection failed.",
    );
  }

  let json: any;
  try {
    json = await response.json();
  } catch {
    throw new ApiError("Failed to parse response from server.", response.status);
  }

  if (!response.ok || !json.success) {
    throw new ApiError(
      json.message || json.error?.message || "Operation failed",
      response.status,
      json.error?.code,
    );
  }

  return json.data as T;
}

export const departmentAdminApi = {
  async getDepartments(): Promise<DepartmentItem[]> {
    const data = await apiCall<{ departments: DepartmentItem[] }>("/departments");
    return data.departments;
  },

  async createDepartmentAdmin(
    token: string,
    input: { departmentId: string; fullName: string; email: string },
  ): Promise<CreateAdminResponse> {
    const data = await apiCall<CreateAdminResponse>(
      "/admin/department-admins",
      {
        method: "POST",
        token,
        body: input,
      },
    );
    return data;
  },

  async getDepartmentAdmins(token: string): Promise<DepartmentAdminItem[]> {
    const data = await apiCall<{ admins: DepartmentAdminItem[] }>(
      "/admin/department-admins",
      { token },
    );
    return data.admins;
  },

  async getDepartmentDashboard(token: string): Promise<DepartmentDashboardData> {
    const data = await apiCall<DepartmentDashboardData>(
      "/department-admin/dashboard",
      { token },
    );
    return data;
  },

  async getDepartmentComplaints(token: string): Promise<DepartmentComplaintItem[]> {
    const data = await apiCall<{ complaints: DepartmentComplaintItem[] }>(
      "/department-admin/complaints",
      { token },
    );
    return data.complaints;
  },

  async resendDepartmentAdminOtp(email: string): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${getApiBaseUrl()}/api/v1/auth/department-admin/resend-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new ApiError(data?.message || "Failed to resend OTP.", response.status);
    }
    return data;
  },

  async getComplaintAiAnalysis(token: string, complaintId: string): Promise<AIAnalysisData> {
    const data = await apiCall<{ analysis: AIAnalysisData }>(
      `/api/v1/complaints/${complaintId}/ai`,
      { token },
    );
    return data.analysis;
  },

  async updateComplaint(
    token: string,
    complaintId: string,
    patch: { category?: string; priority?: string },
  ): Promise<DepartmentComplaintItem> {
    const data = await apiCall<{ complaint: DepartmentComplaintItem }>(
      `/api/v1/complaints/${complaintId}`,
      {
        method: "PATCH",
        token,
        body: patch,
      },
    );
    return data.complaint;
  },
};

