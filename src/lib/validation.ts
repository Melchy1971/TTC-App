import { z } from "zod";

// Email validation with proper format checking
export const emailSchema = z
  .string()
  .trim()
  .min(1, { message: "E-Mail ist erforderlich" })
  .email({ message: "Ungültige E-Mail-Adresse" })
  .max(255, { message: "E-Mail darf maximal 255 Zeichen haben" });

// Password validation with security requirements
export const passwordSchema = z
  .string()
  .min(8, { message: "Passwort muss mindestens 8 Zeichen haben" })
  .max(100, { message: "Passwort darf maximal 100 Zeichen haben" })
  .regex(/[A-Z]/, { message: "Passwort muss mindestens einen Großbuchstaben enthalten" })
  .regex(/[a-z]/, { message: "Passwort muss mindestens einen Kleinbuchstaben enthalten" })
  .regex(/[0-9]/, { message: "Passwort muss mindestens eine Zahl enthalten" });

// Name validation (first name, last name)
export const nameSchema = z
  .string()
  .trim()
  .min(1, { message: "Dieses Feld ist erforderlich" })
  .max(100, { message: "Darf maximal 100 Zeichen haben" })
  .regex(/^[a-zA-ZäöüÄÖÜß\s\-']+$/, { message: "Nur Buchstaben, Leerzeichen und Bindestriche erlaubt" });

// Phone number validation (German format)
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^[\d\s\-+()\/]*$/, { message: "Ungültige Telefonnummer" })
  .max(20, { message: "Telefonnummer darf maximal 20 Zeichen haben" })
  .optional()
  .or(z.literal(""));

// German postal code validation
export const postalCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{5}$/, { message: "PLZ muss genau 5 Ziffern haben" })
  .optional()
  .or(z.literal(""));

// Street address validation
export const streetSchema = z
  .string()
  .trim()
  .max(200, { message: "Straße darf maximal 200 Zeichen haben" })
  .optional()
  .or(z.literal(""));

// City validation
export const citySchema = z
  .string()
  .trim()
  .max(100, { message: "Ort darf maximal 100 Zeichen haben" })
  .optional()
  .or(z.literal(""));

// URL validation
export const urlSchema = z
  .string()
  .trim()
  .url({ message: "Ungültige URL" })
  .max(500, { message: "URL darf maximal 500 Zeichen haben" })
  .optional()
  .or(z.literal(""));

// Member number validation
export const memberNumberSchema = z
  .string()
  .trim()
  .max(50, { message: "Mitgliedsnummer darf maximal 50 Zeichen haben" })
  .optional()
  .or(z.literal(""));

// PIN validation (for match pins)
export const pinSchema = z
  .string()
  .trim()
  .min(1, { message: "PIN ist erforderlich" })
  .max(50, { message: "PIN darf maximal 50 Zeichen haben" })
  .regex(/^[A-Za-z0-9\-_]+$/, { message: "PIN darf nur Buchstaben, Zahlen, Bindestriche und Unterstriche enthalten" });

// Date validation
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Ungültiges Datumsformat (YYYY-MM-DD)" })
  .optional()
  .or(z.literal(""));

// Authentication schemas
export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { message: "Passwort ist erforderlich" }),
});

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: nameSchema,
  lastName: nameSchema,
});

// Profile schema
export const profileSchema = z.object({
  first_name: nameSchema.optional().or(z.literal("")),
  last_name: nameSchema.optional().or(z.literal("")),
  email: emailSchema.optional().or(z.literal("")),
  phone: phoneSchema,
  mobile: phoneSchema,
  member_number: memberNumberSchema,
  street: streetSchema,
  postal_code: postalCodeSchema,
  city: citySchema,
  birthday: dateSchema,
  photo_url: urlSchema,
});

// Member import schema
export const memberImportSchema = z.object({
  first_name: nameSchema,
  last_name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  mobile: phoneSchema,
  member_number: memberNumberSchema,
  street: streetSchema,
  postal_code: postalCodeSchema,
  city: citySchema,
  birthday: dateSchema,
  temporary_password: passwordSchema,
  role: z.enum(["player", "admin", "moderator", "vorstand", "mannschaftsfuehrer"]).optional(),
});

// Pin management schemas
export const matchPinSchema = z.object({
  spielpin: pinSchema,
  spielpartie_pin: z.string().trim().max(50, { message: "Spielcode darf maximal 50 Zeichen haben" }).optional().or(z.literal("")),
});

export const newPinSchema = z.object({
  match_id: z.string().uuid({ message: "Ungültige Spiel-ID" }),
  spielpin: pinSchema,
  spielpartie_pin: z.string().trim().max(50, { message: "Spielcode darf maximal 50 Zeichen haben" }).optional().or(z.literal("")),
});

// Helper function to get validation error message
export const getValidationError = (error: z.ZodError): string => {
  return error.errors.map(err => err.message).join(", ");
};
