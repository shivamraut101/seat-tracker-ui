'use client';

import { useActionState } from 'react'; // Correct import path
import { useFormStatus } from 'react-dom'; // This one is correct
import { useEffect, useState } from 'react';
import { trackFlightAction, FormState } from './actions';

// Default JSON query for the text area
const defaultSearchQuery = {
    "sources": ["GDS"],
    "travelers": [{
      "id": "1",
      "fareOptions": ["STANDARD"],
      "travelerType": "ADULT"
    }],
    "currencyCode": "AED",
    "searchCriteria": {
      "nonStop": true,
      "flightFilters": {
        "cabinRestrictions": [{
          "cabin": "ECONOMY",
          "coverage": "MOST_SEGMENTS",
          "originDestinationIds": ["1"]
        }],
        "carrierRestrictions": {
          "includedCarrierCodes": ["EK"]
        }
      },
      "maxFlightOffers": 250
    },
    "originDestinations": [{
      "id": "1",
      "originLocationCode": "DXB",
      "destinationLocationCode": "BOM",
      "departureDateTimeRange": {
        "date": "2025-07-28",
        "time": "00:00:00"
      }
    }]
  };

// A helper component to manage the submit button's state
function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <button
            type="submit"
            disabled={pending}
            className="inline-flex justify-center rounded-lg border border-transparent bg-indigo-600 py-3 px-6 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-indigo-300"
        >
            {pending ? 'Submitting...' : 'Track Flight'}
        </button>
    );
}

export default function HomePage() {
    // useActionState hook to manage form state and response
    const initialState: FormState = { message: '', status: 'idle' };
    const [state, formAction] = useActionState(trackFlightAction, initialState);

    // State for the form inputs to enable saving to localStorage
    const [email, setEmail] = useState('');
    const [bookingClass, setBookingClass] = useState('');
    const [flightNumber, setFlightNumber] = useState('');
    const [query, setQuery] = useState(JSON.stringify(defaultSearchQuery, null, 2));

    // Load state from localStorage on initial render
    useEffect(() => {
        setEmail(localStorage.getItem('flightTracker_email') || 'agent@example.com');
        setBookingClass(localStorage.getItem('flightTracker_bookingClass') || 'K');
        setFlightNumber(localStorage.getItem('flightTracker_flightNumber') || '511');
        
        const savedQuery = localStorage.getItem('flightTracker_query');
        try {
            // Safely parse the query
            setQuery(savedQuery ? JSON.parse(savedQuery) : JSON.stringify(defaultSearchQuery, null, 2));
        } catch (error) {
            // If parsing fails, fall back to the default query
            console.error("Failed to parse saved query from localStorage:", error);
            setQuery(JSON.stringify(defaultSearchQuery, null, 2));
        }
    }, []);

    // Save state to localStorage whenever it changes
    useEffect(() => {
        if (email) localStorage.setItem('flightTracker_email', email);
    }, [email]);
    useEffect(() => {
        if (bookingClass) localStorage.setItem('flightTracker_bookingClass', bookingClass);
    }, [bookingClass]);
    useEffect(() => {
        if (flightNumber !== undefined) localStorage.setItem('flightTracker_flightNumber', flightNumber);
    }, [flightNumber]);
    useEffect(() => {
        if (query) localStorage.setItem('flightTracker_query', query);
    }, [query]);


    return (
        <main className="flex min-h-screen flex-col items-center bg-gray-50 p-8 sm:p-12 md:p-24">
            <div className="z-10 w-full max-w-4xl items-center justify-between text-sm">
                <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-200">
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">Flight Tracking Request</h1>
                    <p className="text-gray-500 mb-8">Enter the details below to start tracking a flight.</p>

                    <form action={formAction} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Agent Email</label>
                                <input
                                    type="email" id="email" name="email"
                                    value={email} onChange={(e) => setEmail(e.target.value)}
                                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 text-black"
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="bookingClass" className="block text-sm font-medium text-gray-700 mb-1">Target Booking Class</label>
                                <input
                                    type="text" id="bookingClass" name="bookingClass"
                                    value={bookingClass} onChange={(e) => setBookingClass(e.target.value.toUpperCase())}
                                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 text-black"
                                    maxLength={5} required
                                />
                            </div>
                             <div>
                                <label htmlFor="flightNumber" className="block text-sm font-medium text-gray-700 mb-1">Flight Number (Optional)</label>
                                <input
                                    type="text" id="flightNumber" name="flightNumber"
                                    value={flightNumber} onChange={(e) => setFlightNumber(e.target.value)}
                                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 text-black"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="query" className="block text-sm font-medium text-gray-700 mb-1">Amadeus Search Query (JSON)</label>
                            <textarea
                                id="query" name="query" rows={15}
                                value={typeof query === 'string' ? query : JSON.stringify(query, null, 2)}
                                onChange={(e) => setQuery(e.target.value)}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 font-mono text-black"
                                required
                            />
                        </div>

                        <div className="flex items-center justify-end">
                            <SubmitButton />
                        </div>
                    </form>

                    {state.message && (
                        <div className={`mt-6 p-4 rounded-md text-sm ${
                            state.status === 'success' ? 'bg-green-100 text-green-800' : ''
                        } ${
                            state.status === 'error' ? 'bg-red-100 text-red-800' : ''
                        } ${
                            state.status === 'queued' ? 'bg-blue-100 text-blue-800' : ''
                        }`}>
                            {state.message}
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
