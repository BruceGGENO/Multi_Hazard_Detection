export const personnelRoles = {
 ADMIN: 'National Command Center Admin', DISTRICT_OFFICER: 'District Disaster Officer',
 RESPONDER: 'Field Responder', FIELD_REPORTER: 'CHW', CITIZEN: 'Citizen',
} as const;
export type PersonnelRole = keyof typeof personnelRoles;
export type PersonnelInput = { name: string; email: string; role: PersonnelRole; district: string; password: string };
export function validatePersonnel(value: unknown): { data?: PersonnelInput; errors: Record<string, string> } {
 const errors: Record<string, string> = {};
 const row = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
 const name = typeof row.name === 'string' ? row.name.trim() : '';
 const email = typeof row.email === 'string' ? row.email.trim().toLowerCase() : '';
 const district = typeof row.district === 'string' ? row.district.trim() : '';
 const password = typeof row.password === 'string' ? row.password : '';
 if (!name || name.length >= 200) errors.name = 'Enter a full name under 200 characters.';
 if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email address.';
 if (typeof row.role !== 'string' || !Object.hasOwn(personnelRoles, row.role)) errors.role = 'Select a valid role.';
 if (!district || district.length > 80) errors.district = 'Enter an assigned district or location (maximum 80 characters).';
 if (password.length < 14 || password.length > 256) errors.password = 'Use a temporary password of 14–256 characters.';
 return Object.keys(errors).length ? { errors } : { errors, data: { name, email, district, password, role: row.role as PersonnelRole } };
}
