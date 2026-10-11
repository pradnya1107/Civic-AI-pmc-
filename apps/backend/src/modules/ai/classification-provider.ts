export interface ComplaintClassificationSuggestion {
  category: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  summary: string;
}

export interface ComplaintClassificationProvider {
  classifyComplaint(input: {
    title: string;
    description: string;
    location: string;
  }): Promise<ComplaintClassificationSuggestion>;
}
