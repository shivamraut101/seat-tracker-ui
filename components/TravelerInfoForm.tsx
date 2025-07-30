'use client';

import React, { useState, useEffect } from 'react';
import { travelersSchema } from '../app/utils/zod/travelerInfoSchema';
import { ZodError, ZodIssue } from 'zod';

// --- Types ---
export interface TravelerName {
  firstName: string;
  lastName: string;
}
export type DeviceType = 'MOBILE' | 'LANDLINE' | string;
export interface TravelerPhone {
  deviceType: DeviceType;
  countryCallingCode: string;
  number: string;
}
export interface TravelerContact {
  emailAddress: string;
  phones: TravelerPhone[];
}
export type DocumentType = 'PASSPORT' | 'ID_CARD' | 'VISA' | string;
export interface TravelerDocument {
  documentType: DocumentType;
  birthPlace: string;
  issuanceLocation: string;
  issuanceDate: string;
  number: string;
  expiryDate: string;
  issuanceCountry: string;
  validityCountry: string;
  nationality: string;
  holder: boolean;
}
export type GenderType = 'MALE' | 'FEMALE' | 'OTHER' | string;
export interface Traveler {
  id: string;
  dateOfBirth: string;
  name: TravelerName;
  gender: GenderType;
  contact: TravelerContact;
  documents: TravelerDocument[];
}
interface TravelerInfoFormProps {
  travelerInfo: string;
  setTravelerInfo: (value: string) => void;
}

const GENDER_OPTIONS: GenderType[] = ['MALE', 'FEMALE', 'OTHER'];
const DOCUMENT_TYPE_OPTIONS: DocumentType[] = ['PASSPORT', 'ID_CARD', 'VISA'];
const STORAGE_KEY = 'seatTracker_travelers';

// --- Utility ---
function emptyTraveler(): Omit<Traveler, 'id'> {
  return {
    dateOfBirth: '',
    name: { firstName: '', lastName: '' },
    gender: '',
    contact: {
      emailAddress: '',
      phones: [{
        deviceType: 'MOBILE',
        countryCallingCode: '',
        number: ''
      }]
    },
    documents: [
      {
        documentType: 'PASSPORT',
        birthPlace: '',
        issuanceLocation: '',
        issuanceDate: '',
        number: '',
        expiryDate: '',
        issuanceCountry: '',
        validityCountry: '',
        nationality: '',
        holder: true
      }
    ]
  };
}

function sanitizeTraveler(trav: Partial<Omit<Traveler, 'id'>> | undefined): Omit<Traveler, 'id'> {
  // Helper to uppercase country fields safely
  const upper = (val: string | undefined) => val ? val.toUpperCase() : '';
  // Helper to digits-only for countryCallingCode
  const digits = (val: string | undefined) => val ? val.replace(/\D/g, '') : '';
  return {
    dateOfBirth: trav?.dateOfBirth || '',
    name: {
      firstName: trav?.name?.firstName || '',
      lastName: trav?.name?.lastName || ''
    },
    gender: trav?.gender || '',
    contact: {
      emailAddress: trav?.contact?.emailAddress || '',
      phones: Array.isArray(trav?.contact?.phones) && trav.contact.phones.length > 0
        ? trav.contact.phones.map((p: Partial<TravelerPhone>): TravelerPhone => ({
            deviceType: p?.deviceType || 'MOBILE',
            countryCallingCode: digits(p?.countryCallingCode),
            number: p?.number || ''
          }))
        : [{
            deviceType: 'MOBILE',
            countryCallingCode: '',
            number: ''
          }]
    },
    documents: Array.isArray(trav?.documents) && trav.documents.length > 0
      ? trav.documents.map((d: Partial<TravelerDocument>): TravelerDocument => ({
          documentType: d?.documentType || 'PASSPORT',
          birthPlace: upper(d?.birthPlace),
          issuanceLocation: upper(d?.issuanceLocation),
          issuanceDate: d?.issuanceDate || '',
          number: d?.number || '',
          expiryDate: d?.expiryDate || '',
          issuanceCountry: upper(d?.issuanceCountry),
          validityCountry: upper(d?.validityCountry),
          nationality: upper(d?.nationality),
          holder: typeof d?.holder === 'boolean' ? d.holder : true
        }))
      : [ {
          documentType: 'PASSPORT',
          birthPlace: '',
          issuanceLocation: '',
          issuanceDate: '',
          number: '',
          expiryDate: '',
          issuanceCountry: '',
          validityCountry: '',
          nationality: '',
          holder: true
        }]
  };
}

function getSafeTravelers(val: unknown): Omit<Traveler, 'id'>[] {
  if (Array.isArray(val)) return val.map(sanitizeTraveler);
  if (val && typeof val === 'object') return [sanitizeTraveler(val as Partial<Omit<Traveler, 'id'>>)];
  return [emptyTraveler()];
}

// --- Inline error helpers ---
function getFieldError(fieldPath: (string | number)[], zodErrors: ZodIssue[]): string | undefined {
  const pathStr = fieldPath.join('.');
  const found = zodErrors.find(e => e.path.join('.') === pathStr);
  return found?.message;
}
function getPathForTraveler(idx: number, field: string) {
  return [idx, field];
}
function getPathForName(idx: number, key: string) {
  return [idx, 'name', key];
}
function getPathForContact(idx: number, key: string) {
  return [idx, 'contact', key];
}
function getPathForPhone(idx: number, phoneIdx: number, key: string) {
  return [idx, 'contact', 'phones', phoneIdx, key];
}
function getPathForDocument(idx: number, docIdx: number, key: string) {
  return [idx, 'documents', docIdx, key];
}

// --- Main Component ---
export default function TravelerInfoForm({ travelerInfo, setTravelerInfo }: TravelerInfoFormProps) {
  const [travelers, setTravelers] = useState<Omit<Traveler, 'id'>[]>(() => {
    try {
      if (typeof window !== "undefined") {
        const local = window.localStorage.getItem(STORAGE_KEY);
        if (local) {
          return getSafeTravelers(JSON.parse(local));
        }
      }
      return getSafeTravelers(JSON.parse(travelerInfo));
    } catch {
      return [emptyTraveler()];
    }
  });

  // Track which fields have been touched (blurred at least once)
  type TouchedMap = Record<string, boolean>;
  const [touched, setTouched] = useState<TouchedMap>({});
  const [zodErrors, setZodErrors] = useState<ZodIssue[]>([]);

  // Validate and sanitize on travelers change
  useEffect(() => {
    // Always sanitize before validating and saving
    const travelersSanitized = travelers.map(sanitizeTraveler);

    try {
      travelersSchema.parse(travelersSanitized);
      setZodErrors([]);
    } catch (err) {
      if (err instanceof ZodError) {
        setZodErrors(err.issues);
      } else {
        setZodErrors([{ path: [], message: String(err), code: "custom", input: travelersSanitized } as ZodIssue]);
      }
    }

    const travelersWithIds: Traveler[] = travelersSanitized.map((t, idx) => ({
      ...t,
      id: String(idx + 1),
    }));
    setTravelerInfo(JSON.stringify(travelersWithIds, null, 2));
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(travelersSanitized));
    }
  }, [travelers, setTravelerInfo]);

  // --- Handlers ---
  const handleTravelerChange = (idx: number, field: keyof Omit<Traveler, 'id'>, value: string) => {
    setTravelers(prev => prev.map((trav, i) => (i === idx ? { ...trav, [field]: value } : trav)));
  };

  const handleNameChange = (idx: number, key: keyof TravelerName, value: string) => {
    setTravelers(prev =>
      prev.map((trav, i) =>
        i === idx ? { ...trav, name: { ...trav.name, [key]: value } } : trav
      )
    );
  };

  const handleEmailChange = (idx: number, value: string) => {
    setTravelers(prev =>
      prev.map((trav, i) =>
        i === idx
          ? { ...trav, contact: { ...trav.contact, emailAddress: value } }
          : trav
      )
    );
  };

  const handlePhoneChange = (
    idx: number,
    phoneIdx: number,
    key: keyof TravelerPhone,
    value: string
  ) => {
    setTravelers(prev =>
      prev.map((trav, i) =>
        i === idx
          ? {
              ...trav,
              contact: {
                ...trav.contact,
                phones: trav.contact.phones.map((p, pi) =>
                  pi === phoneIdx
                    ? {
                        ...p,
                        // countryCallingCode: always keep only digits
                        [key]:
                          key === "countryCallingCode"
                            ? value.replace(/\D/g, "")
                            : p[key] !== undefined
                            ? value
                            : p[key]
                      }
                    : p
                )
              }
            }
          : trav
      )
    );
  };

  const handleDocumentChange = (
    travIdx: number,
    docIdx: number,
    key: keyof TravelerDocument,
    value: string | boolean
  ) => {
    setTravelers(prev =>
      prev.map((trav, i) =>
        i === travIdx
          ? {
              ...trav,
              documents: trav.documents.map((doc, di) =>
                di === docIdx
                  ? {
                      ...doc,
                      // Uppercase for country codes and locations
                      [key]:
                        [
                          "birthPlace",
                          "issuanceLocation",
                          "issuanceCountry",
                          "validityCountry",
                          "nationality"
                        ].includes(key)
                          ? typeof value === "string"
                            ? value.toUpperCase()
                            : value
                          : value
                    }
                  : doc
              )
            }
          : trav
      )
    );
  };

  const addTraveler = () => setTravelers(prev => [...prev, emptyTraveler()]);
  const removeTraveler = (idx: number) => setTravelers(prev => prev.filter((_, i) => i !== idx));
  const addDocument = (travIdx: number) => {
    setTravelers(prev =>
      prev.map((trav, i) =>
        i === travIdx
          ? {
              ...trav,
              documents: [
                ...trav.documents,
                {
                  documentType: 'PASSPORT',
                  birthPlace: '',
                  issuanceLocation: '',
                  issuanceDate: '',
                  number: '',
                  expiryDate: '',
                  issuanceCountry: '',
                  validityCountry: '',
                  nationality: '',
                  holder: true
                }
              ]
            }
          : trav
      )
    );
  };
  const removeDocument = (travIdx: number, docIdx: number) => {
    setTravelers(prev =>
      prev.map((trav, i) =>
        i === travIdx
          ? {
              ...trav,
              documents: trav.documents.filter((_, di) => di !== docIdx)
            }
          : trav
      )
    );
  };

  // Clear All handler
  const handleClearAll = () => {
    setTravelers([emptyTraveler()]);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  };

  // --- Touch helpers ---
  function touchField(path: (string | number)[]) {
    setTouched(prev => ({ ...prev, [path.join('.')]: true }));
  }
  function shouldShowError(fieldPath: (string | number)[]) {
    // Show if field was touched
    return touched[fieldPath.join('.')];
  }

  // --- Render ---
  return (
    <div>
      <h2 className="text-2xl font-extrabold text-indigo-800 mb-4">Traveler Info</h2>
      {Array.isArray(travelers) && travelers.map((trav, idx) => (
        <div key={idx} className="mb-8 p-6 rounded-2xl border border-indigo-100 bg-indigo-50 shadow transition-all">
          <div className="flex items-center mb-2">
            <span className="font-bold text-lg text-indigo-900 mr-3">Traveler #{idx + 1}</span>
            {travelers.length > 1 && (
              <button
                type="button"
                onClick={() => removeTraveler(idx)}
                className="ml-auto text-red-600 hover:text-white hover:bg-red-600 border border-red-600 px-4 py-1 rounded-lg font-semibold transition"
              >
                Remove Traveler
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-4 mb-4">
            <label className="block flex-1 min-w-[180px]">
              <span className="text-sm font-semibold text-indigo-700">Date of Birth</span>
              <input
                className="block w-full mt-1 p-2 rounded bg-white border border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 text-gray-900 font-medium"
                type="date"
                value={trav.dateOfBirth}
                onChange={e => handleTravelerChange(idx, 'dateOfBirth', e.target.value)}
                onBlur={() => touchField(getPathForTraveler(idx, 'dateOfBirth'))}
              />
              {shouldShowError(getPathForTraveler(idx, 'dateOfBirth')) &&
                <span className="text-xs text-red-600">{getFieldError(getPathForTraveler(idx, 'dateOfBirth'), zodErrors)}</span>
              }
            </label>
            <label className="block flex-1 min-w-[180px]">
              <span className="text-sm font-semibold text-indigo-700">Gender</span>
              <select
                className="block w-full mt-1 p-2 rounded bg-white border border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 text-gray-900 font-medium"
                value={trav.gender}
                onChange={e => handleTravelerChange(idx, 'gender', e.target.value)}
                onBlur={() => touchField(getPathForTraveler(idx, 'gender'))}
              >
                <option value="">Select...</option>
                {GENDER_OPTIONS.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
              {shouldShowError(getPathForTraveler(idx, 'gender')) &&
                <span className="text-xs text-red-600">{getFieldError(getPathForTraveler(idx, 'gender'), zodErrors)}</span>
              }
            </label>
          </div>
          <div className="flex flex-wrap gap-4 mb-4">
            <label className="block flex-1 min-w-[180px]">
              <span className="text-sm font-semibold text-indigo-700">First Name</span>
              <input
                className="block w-full mt-1 p-2 rounded bg-white border border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 text-gray-900 font-medium"
                type="text"
                value={trav.name.firstName}
                onChange={e => handleNameChange(idx, 'firstName', e.target.value)}
                onBlur={() => touchField(getPathForName(idx, 'firstName'))}
              />
              {shouldShowError(getPathForName(idx, 'firstName')) &&
                <span className="text-xs text-red-600">{getFieldError(getPathForName(idx, 'firstName'), zodErrors)}</span>
              }
            </label>
            <label className="block flex-1 min-w-[180px]">
              <span className="text-sm font-semibold text-indigo-700">Last Name</span>
              <input
                className="block w-full mt-1 p-2 rounded bg-white border border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 text-gray-900 font-medium"
                type="text"
                value={trav.name.lastName}
                onChange={e => handleNameChange(idx, 'lastName', e.target.value)}
                onBlur={() => touchField(getPathForName(idx, 'lastName'))}
              />
              {shouldShowError(getPathForName(idx, 'lastName')) &&
                <span className="text-xs text-red-600">{getFieldError(getPathForName(idx, 'lastName'), zodErrors)}</span>
              }
            </label>
          </div>
          <div className="flex flex-wrap gap-4 mb-4">
            <label className="block flex-1 min-w-[180px]">
              <span className="text-sm font-semibold text-indigo-700">Email Address</span>
              <input
                className="block w-full mt-1 p-2 rounded bg-white border border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 text-gray-900 font-medium"
                type="email"
                value={trav.contact.emailAddress}
                onChange={e => handleEmailChange(idx, e.target.value)}
                onBlur={() => touchField(getPathForContact(idx, 'emailAddress'))}
              />
              {shouldShowError(getPathForContact(idx, 'emailAddress')) &&
                <span className="text-xs text-red-600">{getFieldError(getPathForContact(idx, 'emailAddress'), zodErrors)}</span>
              }
            </label>
            <label className="block flex-1 min-w-[180px]">
              <span className="text-sm font-semibold text-indigo-700">Phone Country Code <span className="text-xs text-indigo-500">(e.g. 91, not +91)</span></span>
              <input
                className="block w-full mt-1 p-2 rounded bg-white border border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 text-gray-900 font-medium"
                type="text"
                placeholder="91"
                value={trav.contact.phones[0]?.countryCallingCode || ''}
                onChange={e => handlePhoneChange(idx, 0, 'countryCallingCode', e.target.value)}
                onBlur={() => touchField(getPathForPhone(idx, 0, 'countryCallingCode'))}
              />
              {shouldShowError(getPathForPhone(idx, 0, 'countryCallingCode')) &&
                <span className="text-xs text-red-600">{getFieldError(getPathForPhone(idx, 0, 'countryCallingCode'), zodErrors)}</span>
              }
            </label>
            <label className="block flex-1 min-w-[180px]">
              <span className="text-sm font-semibold text-indigo-700">Phone Number</span>
              <input
                className="block w-full mt-1 p-2 rounded bg-white border border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 text-gray-900 font-medium"
                type="text"
                value={trav.contact.phones[0]?.number || ''}
                onChange={e => handlePhoneChange(idx, 0, 'number', e.target.value)}
                onBlur={() => touchField(getPathForPhone(idx, 0, 'number'))}
              />
              {shouldShowError(getPathForPhone(idx, 0, 'number')) &&
                <span className="text-xs text-red-600">{getFieldError(getPathForPhone(idx, 0, 'number'), zodErrors)}</span>
              }
            </label>
          </div>
          <div className="mb-4">
            <span className="block font-bold text-indigo-900 text-lg mb-2">Documents</span>
            {trav.documents.map((doc, docIdx) => (
              <div
                key={docIdx}
                className="border border-indigo-200 rounded-xl bg-white shadow-sm p-4 mb-4 relative"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                  <label className="block">
                    <span className="text-sm font-semibold text-indigo-700">Type</span>
                    <select
                      className="block w-full mt-1 p-2 rounded border border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 text-gray-900 font-medium"
                      value={doc.documentType}
                      onChange={e =>
                        handleDocumentChange(idx, docIdx, 'documentType', e.target.value)
                      }
                      onBlur={() => touchField(getPathForDocument(idx, docIdx, 'documentType'))}
                    >
                      {DOCUMENT_TYPE_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                    {shouldShowError(getPathForDocument(idx, docIdx, 'documentType')) &&
                      <span className="text-xs text-red-600">{getFieldError(getPathForDocument(idx, docIdx, 'documentType'), zodErrors)}</span>
                    }
                  </label>
                  <label className="block">
                    <span className="text-sm font-semibold text-indigo-700">Number</span>
                    <input
                      className="block w-full mt-1 p-2 rounded border border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 text-gray-900 font-medium"
                      type="text"
                      value={doc.number}
                      onChange={e =>
                        handleDocumentChange(idx, docIdx, 'number', e.target.value)
                      }
                      onBlur={() => touchField(getPathForDocument(idx, docIdx, 'number'))}
                    />
                    {shouldShowError(getPathForDocument(idx, docIdx, 'number')) &&
                      <span className="text-xs text-red-600">{getFieldError(getPathForDocument(idx, docIdx, 'number'), zodErrors)}</span>
                    }
                  </label>
                  <label className="block">
                    <span className="text-sm font-semibold text-indigo-700">Nationality <span className="text-xs text-indigo-500">(e.g. IN, FR, US)</span></span>
                    <input
                      className="block w-full mt-1 p-2 rounded border border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 text-gray-900 font-medium"
                      type="text"
                      placeholder="IN"
                      value={doc.nationality}
                      onChange={e =>
                        handleDocumentChange(idx, docIdx, 'nationality', e.target.value)
                      }
                      onBlur={() => touchField(getPathForDocument(idx, docIdx, 'nationality'))}
                    />
                    {shouldShowError(getPathForDocument(idx, docIdx, 'nationality')) &&
                      <span className="text-xs text-red-600">{getFieldError(getPathForDocument(idx, docIdx, 'nationality'), zodErrors)}</span>
                    }
                  </label>
                  <label className="block">
                    <span className="text-sm font-semibold text-indigo-700">Issuance Country <span className="text-xs text-indigo-500">(e.g. IN, FR, US)</span></span>
                    <input
                      className="block w-full mt-1 p-2 rounded border border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 text-gray-900 font-medium"
                      type="text"
                      placeholder="IN"
                      value={doc.issuanceCountry}
                      onChange={e =>
                        handleDocumentChange(idx, docIdx, 'issuanceCountry', e.target.value)
                      }
                      onBlur={() => touchField(getPathForDocument(idx, docIdx, 'issuanceCountry'))}
                    />
                    {shouldShowError(getPathForDocument(idx, docIdx, 'issuanceCountry')) &&
                      <span className="text-xs text-red-600">{getFieldError(getPathForDocument(idx, docIdx, 'issuanceCountry'), zodErrors)}</span>
                    }
                  </label>
                  <label className="block">
                    <span className="text-sm font-semibold text-indigo-700">Birth Place <span className="text-xs text-indigo-500">(e.g. IN, FR, US)</span></span>
                    <input
                      className="block w-full mt-1 p-2 rounded border border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 text-gray-900 font-medium"
                      type="text"
                      placeholder="IN"
                      value={doc.birthPlace}
                      onChange={e =>
                        handleDocumentChange(idx, docIdx, 'birthPlace', e.target.value)
                      }
                      onBlur={() => touchField(getPathForDocument(idx, docIdx, 'birthPlace'))}
                    />
                    {shouldShowError(getPathForDocument(idx, docIdx, 'birthPlace')) &&
                      <span className="text-xs text-red-600">{getFieldError(getPathForDocument(idx, docIdx, 'birthPlace'), zodErrors)}</span>
                    }
                  </label>
                  <label className="block">
                    <span className="text-sm font-semibold text-indigo-700">Issuance Location <span className="text-xs text-indigo-500">(e.g. IN, FR, US)</span></span>
                    <input
                      className="block w-full mt-1 p-2 rounded border border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 text-gray-900 font-medium"
                      type="text"
                      placeholder="IN"
                      value={doc.issuanceLocation}
                      onChange={e =>
                        handleDocumentChange(idx, docIdx, 'issuanceLocation', e.target.value)
                      }
                      onBlur={() => touchField(getPathForDocument(idx, docIdx, 'issuanceLocation'))}
                    />
                    {shouldShowError(getPathForDocument(idx, docIdx, 'issuanceLocation')) &&
                      <span className="text-xs text-red-600">{getFieldError(getPathForDocument(idx, docIdx, 'issuanceLocation'), zodErrors)}</span>
                    }
                  </label>
                  <label className="block">
                    <span className="text-sm font-semibold text-indigo-700">Issuance Date</span>
                    <input
                      className="block w-full mt-1 p-2 rounded border border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 text-gray-900 font-medium"
                      type="date"
                      value={doc.issuanceDate}
                      onChange={e =>
                        handleDocumentChange(idx, docIdx, 'issuanceDate', e.target.value)
                      }
                      onBlur={() => touchField(getPathForDocument(idx, docIdx, 'issuanceDate'))}
                    />
                    {shouldShowError(getPathForDocument(idx, docIdx, 'issuanceDate')) &&
                      <span className="text-xs text-red-600">{getFieldError(getPathForDocument(idx, docIdx, 'issuanceDate'), zodErrors)}</span>
                    }
                  </label>
                  <label className="block">
                    <span className="text-sm font-semibold text-indigo-700">Expiry Date</span>
                    <input
                      className="block w-full mt-1 p-2 rounded border border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 text-gray-900 font-medium"
                      type="date"
                      value={doc.expiryDate}
                      onChange={e =>
                        handleDocumentChange(idx, docIdx, 'expiryDate', e.target.value)
                      }
                      onBlur={() => touchField(getPathForDocument(idx, docIdx, 'expiryDate'))}
                    />
                    {shouldShowError(getPathForDocument(idx, docIdx, 'expiryDate')) &&
                      <span className="text-xs text-red-600">{getFieldError(getPathForDocument(idx, docIdx, 'expiryDate'), zodErrors)}</span>
                    }
                  </label>
                </div>
                <div className="flex items-center gap-6 mt-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={doc.holder}
                      onChange={e =>
                        handleDocumentChange(idx, docIdx, 'holder', e.target.checked)
                      }
                      className="accent-indigo-600"
                      onBlur={() => touchField(getPathForDocument(idx, docIdx, 'holder'))}
                    />
                    <span className="text-indigo-700">Holder</span>
                  </label>
                  <label className="flex-1">
                    <span className="text-sm font-semibold text-indigo-700">Validity Country <span className="text-xs text-indigo-500">(e.g. IN, FR, US)</span></span>
                    <input
                      className="block w-full mt-1 p-2 rounded border border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 text-gray-900 font-medium"
                      type="text"
                      placeholder="IN"
                      value={doc.validityCountry}
                      onChange={e =>
                        handleDocumentChange(idx, docIdx, 'validityCountry', e.target.value)
                      }
                      onBlur={() => touchField(getPathForDocument(idx, docIdx, 'validityCountry'))}
                    />
                    {shouldShowError(getPathForDocument(idx, docIdx, 'validityCountry')) &&
                      <span className="text-xs text-red-600">{getFieldError(getPathForDocument(idx, docIdx, 'validityCountry'), zodErrors)}</span>
                    }
                  </label>
                  {trav.documents.length > 1 && (
                    <button
                      type="button"
                      className="ml-auto text-red-600 hover:text-white hover:bg-red-600 border border-red-600 px-4 py-1 rounded-lg font-semibold transition"
                      onClick={() => removeDocument(idx, docIdx)}
                    >
                      Remove Document
                    </button>
                  )}
                </div>
              </div>
            ))}
            <button
              type="button"
              className="text-blue-700 hover:text-white hover:bg-blue-700 border border-blue-700 px-4 py-1 rounded-lg font-semibold mt-2 transition"
              onClick={() => addDocument(idx)}
            >
              + Add Document
            </button>
          </div>
        </div>
      ))}
      <div className="flex gap-4 mb-6">
        <button
          type="button"
          className="bg-indigo-700 hover:bg-indigo-800 text-white font-bold px-6 py-2 rounded-xl shadow transition"
          onClick={addTraveler}
        >
          + Add Traveler
        </button>
        <button
          type="button"
          className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-2 rounded-xl shadow transition"
          onClick={handleClearAll}
        >
          Clear All
        </button>
      </div>
    </div>
  );
}

