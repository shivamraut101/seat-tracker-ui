import { z } from "zod";

// UPPERCASE ISO country code regex (e.g. "IN")
const countryCodeRegex = /^[A-Z]{2}$/;
// Digits only for country calling code (e.g. "91")
const digitsOnlyRegex = /^\d+$/;

export const travelerNameSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
});

export const travelerPhoneSchema = z.object({
  deviceType: z.string().min(1),
  countryCallingCode: z.string()
    .min(1, "Country code is required")
    .regex(digitsOnlyRegex, "Country code must be digits only (e.g. 91)"),
  number: z.string().min(1, "Phone number is required"),
});

export const travelerContactSchema = z.object({
  emailAddress: z.string().email("Invalid email address"),
  phones: z.array(travelerPhoneSchema).min(1),
});

export const travelerDocumentSchema = z.object({
  documentType: z.string().min(1),
  birthPlace: z.string().regex(countryCodeRegex, "Must be a valid ISO country code (e.g. IN)"),
  issuanceLocation: z.string().regex(countryCodeRegex, "Must be a valid ISO country code (e.g. IN)"),
  issuanceDate: z.string().min(1, "Issuance date is required"),
  number: z.string().min(1, "Document number is required"),
  expiryDate: z.string().min(1, "Expiry date is required"),
  issuanceCountry: z.string().regex(countryCodeRegex, "Must be a valid ISO country code (e.g. IN)"),
  validityCountry: z.string().regex(countryCodeRegex, "Must be a valid ISO country code (e.g. IN)"),
  nationality: z.string().regex(countryCodeRegex, "Must be a valid ISO country code (e.g. IN)"),
  holder: z.boolean(),
});

export const travelerSchema = z.object({
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  name: travelerNameSchema,
  gender: z.string().min(1, "Gender is required"),
  contact: travelerContactSchema,
  documents: z.array(travelerDocumentSchema).min(1),
});

export const travelersSchema = z.array(travelerSchema).min(1);