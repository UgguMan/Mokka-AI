import {z} from 'zod';
export const careSchema=z.object({
  treatmentSummary:z.string().trim().min(1).max(1200),
  careSummary:z.string().trim().min(1).max(1200)
}).strict();
export const CARE_INSTRUCTIONS='Include treatmentSummary and careSummary as concise plain-language summaries, 2–3 sentences each. Treatment: explain practical disease-management steps conditional on the tentative finding; do not promise a cure, and state when damage cannot be reversed or no cure exists. For apparently healthy leaves say no treatment is indicated. For uncertain findings give only low-risk interim steps and request confirmation, not disease-specific treatment. For non-leaf images request a clear leaf photo instead of treatment. Care: give relevant watering, airflow, hygiene, monitoring and prevention advice without assuming unknown growing conditions. Do not recommend pesticide products, names, doses or unsupported home remedies. Advise expert confirmation before disease-specific treatment.';
