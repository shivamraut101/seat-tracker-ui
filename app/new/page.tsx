'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { useEffect, useState } from 'react';
import { trackFlightAction, FormState } from '../actions/actions';
import TravelerInfoForm from '../../components/TravelerInfoForm';

// --- Robust localStorage utils ---
function safeLocalStorageGet(key: string, fallback: any, asJSON = true) {
  if (typeof window !== 'undefined' && window.localStorage) {
    const value = localStorage.getItem(key);
    if (value === null) return fallback;
    if (!asJSON) return value;
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return fallback;
}
function safeLocalStorageSet(key: string, value: any, asJSON = true) {
  if (typeof window !== 'undefined' && window.localStorage) {
    if (!asJSON) {
      localStorage.setItem(key, value);
    } else {
      localStorage.setItem(key, JSON.stringify(value));
    }
  }
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex justify-center rounded-xl border border-transparent bg-indigo-700 py-3 px-7 text-base font-semibold text-white shadow transition-colors duration-150 hover:bg-indigo-800 active:bg-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-indigo-300"
    >
      {pending ? 'Submitting…' : 'Track Flight'}
    </button>
  );
}

const DEFAULT_TRAVELER = {
  id: '1',
  dateOfBirth: '',
  name: { firstName: '', lastName: '' },
  gender: '',
  contact: { emailAddress: '', phones: [{ deviceType: 'MOBILE', countryCallingCode: '', number: '' }] },
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
      holder: true,
    },
  ],
};

// --- NEW: Default Booking Preference row
const DEFAULT_BOOKING_PREFERENCE = { id: 1, bookingClass: '', flightNumber: '', carrierCode: '' };

export default function HomePage() {
  const initialState: FormState = { message: '', status: 'idle' };
  const [state, formAction] = useActionState(trackFlightAction, initialState);

  const [email, setEmail] = useState('');
  // --- NEW: array of booking preferences
  const [bookingPrefs, setBookingPrefs] = useState([
    { ...DEFAULT_BOOKING_PREFERENCE }
  ]);
  // Traveler info as JSON string!
  const [travelerInfo, setTravelerInfo] = useState(JSON.stringify([DEFAULT_TRAVELER], null, 2));
  const [query, setQuery] = useState('');

  // --- NEW: bookingPrefs localStorage
  useEffect(() => {
    setEmail(safeLocalStorageGet('flightTracker_email', 'agent@example.com'));
    setBookingPrefs(safeLocalStorageGet('flightTracker_bookingPrefs', [{ ...DEFAULT_BOOKING_PREFERENCE }]));
    setTravelerInfo(
      safeLocalStorageGet(
        'flightTracker_travelerInfo',
        JSON.stringify([DEFAULT_TRAVELER], null, 2),
        false
      )
    );
    setQuery(safeLocalStorageGet('flightTracker_query', '', false));
  }, []);

  useEffect(() => { safeLocalStorageSet('flightTracker_email', email); }, [email]);
  useEffect(() => { safeLocalStorageSet('flightTracker_bookingPrefs', bookingPrefs); }, [bookingPrefs]);
  useEffect(() => { safeLocalStorageSet('flightTracker_travelerInfo', travelerInfo, false); }, [travelerInfo]);
  useEffect(() => { safeLocalStorageSet('flightTracker_query', query, false); }, [query]);

  // --- Booking Prefs Handlers
  const addBookingPref = () => {
    setBookingPrefs(prev => [
      ...prev,
      { id: prev.length ? Math.max(...prev.map(x => x.id)) + 1 : 1, bookingClass: '', flightNumber: '', carrierCode: '' }
    ]);
  };
  const removeBookingPref = (idx: number) => setBookingPrefs(bookingPrefs.filter((_, i) => i !== idx));
  const updateBookingPref = (idx: number, key: 'bookingClass' | 'flightNumber' | 'carrierCode', value: string) => {
    setBookingPrefs(bookingPrefs.map((row, i) => i === idx ? { ...row, [key]: value } : row));
  };

  // Debug log for all values before submit
  const debugLog = () => {
    console.log('--- SUBMIT DEBUG ---');
    console.log('email', email);
    console.log('bookingPrefs', bookingPrefs);
    console.log('bookingPrefsString', JSON.stringify(bookingPrefs));
    console.log('travelerInfo (string)', travelerInfo);
    try {
      console.log('travelerInfo (parsed)', JSON.parse(travelerInfo));
    } catch (err) {
      console.log('travelerInfo PARSE ERROR', err);
    }
    console.log('query', query);
  };

  // Wrap form action to add debug logs
  const debugAndSubmit = async (formData: FormData) => {
    debugLog();
    return await formAction(formData);
  };

  return (
    <main className="flex min-h-screen flex-col items-center bg-gray-100 p-8 sm:p-12 md:p-24">
      <div className="z-10 w-full max-w-4xl">
        <div className="bg-white p-10 rounded-3xl shadow-2xl border border-gray-200">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-3 tracking-tight">Flight Tracking Request</h1>
          <p className="text-gray-500 mb-10 text-lg">Fill in the flight and traveler details to start tracking seat availability.</p>
          <form action={debugAndSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-1 gap-8">
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-1">
                  Agent Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-base p-3 text-gray-800 bg-gray-50"
                  required
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Booking Preferences
                </label>
                <div className="space-y-2">
                  {bookingPrefs.map((row, idx) => (
                    <div key={row.id} className="flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        placeholder="Booking Class"
                        value={row.bookingClass}
                        onChange={e => updateBookingPref(idx, 'bookingClass', e.target.value.toUpperCase())}
                        className="w-[120px] rounded-lg border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-base p-3 text-gray-800 bg-gray-50"
                        maxLength={5}
                        required
                        autoComplete="off"
                      />
                      <input
                        type="text"
                        placeholder="Flight Number"
                        value={row.flightNumber}
                        onChange={e => updateBookingPref(idx, 'flightNumber', e.target.value.toUpperCase())}
                        className="w-[140px] rounded-lg border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-base p-3 text-gray-800 bg-gray-50"
                        maxLength={10}
                        required
                        autoComplete="off"
                      />
                      <input
                        type="text"
                        placeholder="Carrier Code"
                        value={row.carrierCode}
                        onChange={e => updateBookingPref(idx, 'carrierCode', e.target.value.toUpperCase())}
                        className="w-[120px] rounded-lg border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-base p-3 text-gray-800 bg-gray-50"
                        maxLength={5}
                        required
                        autoComplete="off"
                      />
                      {bookingPrefs.length > 1 && (
                        <button type="button" title="Remove" onClick={() => removeBookingPref(idx)}
                          className="px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 font-bold"
                        >−</button>
                      )}
                    </div>
                  ))}
                  <button type="button" onClick={addBookingPref}
                    className="mt-2 px-4 py-2 rounded bg-indigo-100 text-indigo-700 hover:bg-indigo-200 font-semibold"
                  >
                    + Add More
                  </button>
                </div>
              </div>
            </div>
            {/* Traveler Info Form */}
            <div className="py-6">
              <TravelerInfoForm travelerInfo={travelerInfo} setTravelerInfo={setTravelerInfo} />
            </div>
            {/* Editable Amadeus Search Query */}
            <div>
              <label htmlFor="query" className="block text-sm font-semibold text-gray-700 mb-1">
                Amadeus Search Query (JSON)
              </label>
              <textarea
                id="query"
                name="query"
                rows={15}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 font-mono text-gray-900 bg-gray-50"
                required
                autoComplete="off"
              />
            </div>
            {/* Hidden fields for full traveler info and booking preferences */}
            <input type="hidden" name="travelerInfo" value={travelerInfo} />
            <input type="hidden" name="bookingPreferences" value={JSON.stringify(bookingPrefs)} />
            <div className="flex items-center justify-end">
              <SubmitButton />
            </div>
          </form>
          {state.message && (
            <div
              className={`mt-8 p-4 rounded-md text-md font-semibold border ${
                state.status === 'success'
                  ? 'bg-green-600 text-white border-green-700'
                  : state.status === 'error'
                  ? 'bg-red-600 text-white border-red-700'
                  : state.status === 'queued'
                  ? 'bg-blue-600 text-white border-blue-700'
                  : 'bg-gray-200 text-gray-900 border-gray-300'
              }`}
            >
              {state.message}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}