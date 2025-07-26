'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { useEffect, useState } from 'react';
import { trackFlightAction, FormState } from './actions';
import TravelerInfoForm from './components/TravelerInfoForm';

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

export default function HomePage() {
  // Server Action state
  const initialState: FormState = { message: '', status: 'idle' };
  const [state, formAction] = useActionState(trackFlightAction, initialState);

  // Form fields
  const [email, setEmail] = useState('');
  const [bookingClass, setBookingClass] = useState('');
  const [flightNumber, setFlightNumber] = useState('');
  const [travelerInfo, setTravelerInfo] = useState(
    JSON.stringify(
      [
        {
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
        },
      ],
      null,
      2
    )
  );
  const [query, setQuery] = useState('');

  // On mount, load all fields (including query) from localStorage if present, otherwise set defaults
  useEffect(() => {
    setEmail(localStorage.getItem('flightTracker_email') || 'agent@example.com');
    setBookingClass(localStorage.getItem('flightTracker_bookingClass') || 'K');
    setFlightNumber(localStorage.getItem('flightTracker_flightNumber') || '511');
    setTravelerInfo(localStorage.getItem('flightTracker_travelerInfo') || JSON.stringify([
      {
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
      },
    ], null, 2));
    const savedQuery = localStorage.getItem('flightTracker_query');
    setQuery(savedQuery !== null ? savedQuery : '');
  }, []);

  // Persist fields to localStorage when they change
  useEffect(() => { if (email) localStorage.setItem('flightTracker_email', email); }, [email]);
  useEffect(() => { if (bookingClass) localStorage.setItem('flightTracker_bookingClass', bookingClass); }, [bookingClass]);
  useEffect(() => { if (flightNumber !== undefined) localStorage.setItem('flightTracker_flightNumber', flightNumber); }, [flightNumber]);
  useEffect(() => { if (travelerInfo) localStorage.setItem('flightTracker_travelerInfo', travelerInfo); }, [travelerInfo]);
  useEffect(() => { localStorage.setItem('flightTracker_query', query); }, [query]);

  return (
    <main className="flex min-h-screen flex-col items-center bg-gray-100 p-8 sm:p-12 md:p-24">
      <div className="z-10 w-full max-w-4xl">
        <div className="bg-white p-10 rounded-3xl shadow-2xl border border-gray-200">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-3 tracking-tight">Flight Tracking Request</h1>
          <p className="text-gray-500 mb-10 text-lg">Fill in the flight and traveler details to start tracking seat availability.</p>
          <form action={formAction} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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
                />
              </div>
              <div>
                <label htmlFor="bookingClass" className="block text-sm font-semibold text-gray-700 mb-1">
                  Target Booking Class
                </label>
                <input
                  type="text"
                  id="bookingClass"
                  name="bookingClass"
                  value={bookingClass}
                  onChange={(e) => setBookingClass(e.target.value.toUpperCase())}
                  className="block w-full rounded-lg border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-base p-3 text-gray-800 bg-gray-50"
                  maxLength={5}
                  required
                />
              </div>
              <div>
                <label htmlFor="flightNumber" className="block text-sm font-semibold text-gray-700 mb-1">
                  Flight Number <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <input
                  type="text"
                  id="flightNumber"
                  name="flightNumber"
                  value={flightNumber}
                  onChange={(e) => setFlightNumber(e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-base p-3 text-gray-800 bg-gray-50"
                />
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
              />
            </div>
            {/* Hidden field for full traveler info */}
            <input type="hidden" name="travelerInfo" value={travelerInfo} />
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