import { Department } from "./department.model";

export async function listDepartments() {
  return Department.find({ isActive: true })
    .select("name slug description")
    .sort({ name: 1 })
    .lean();
}
