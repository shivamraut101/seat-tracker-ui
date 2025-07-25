
'use server'; // This marks all functions in this file as Server Actions

import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import nodemailer from 'nodemailer';


// --- Configuration ---
// Ensure these are in your project's .env.local file
const AMADEUS_API_KEY = process.env.AMADEUS_API_KEY;
const AMADEUS_API_SECRET = process.env.AMADEUS_API_SECRET;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const emailUser = process.env.EMAIL_USER;
const emailPass = process.env.EMAIL_PASS;

// Initialize Supabase client
const supabase = createClient(supabaseUrl!, supabaseKey!);

// Initialize Nodemailer transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: emailUser,
        pass: emailPass,
    },
});


// --- Schemas and Types ---
const flightRequestSchema = z.object({
  submitted_by: z.string().email({ message: "Invalid email address." }),
  target_booking_class: z.string().min(1, { message: "Booking class cannot be empty." }),
  search_query_str: z.string().refine((val) => {
    try {
      JSON.parse(val);
      return true;
    } catch (e) {
      return false;
    }
  }, { message: "Search query must be valid JSON." })
});

export type FormState = {
    message: string;
    status: 'idle' | 'success' | 'error' | 'queued';
}

// --- Helper Functions ---

async function getAmadeusToken() {
    try {
        const response = await axios.post(
            'https://test.travel.api.amadeus.com/v1/security/oauth2/token',
            `grant_type=client_credentials&client_id=${AMADEUS_API_KEY}&client_secret=${AMADEUS_API_SECRET}`,
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );
        return (response.data as { access_token: string }).access_token;
    } catch (error) {
        console.error('🚨 Immediate Check: Failed to get Amadeus token', error);
        return null;
    }
}

async function searchForFlightOnce(accessToken: string, searchQuery: any, targetBookingClass: string) {
    try {
        const response = await axios.post(
            'https://test.travel.api.amadeus.com/v2/shopping/flight-offers',
            searchQuery,
            { headers: { 'Authorization': `Bearer ${accessToken}` } }
        );
        const flightOffers = (response.data as { data: any[] }).data;
        if (!flightOffers) return null;

        for (const offer of flightOffers) {
           for (const pricing of offer.travelerPricings) {
                for (const fareDetails of pricing.fareDetailsBySegment) {
                    if (fareDetails.class === targetBookingClass) {
                        return offer;
                    }
                }
            }
        }
        return null;
    } catch (error) {
        console.error('🚨 Immediate Check: Flight search failed', error);
        return null;
    }
}

async function sendImmediateNotification(recipientEmail: string, flightOffer: any) {
    const itinerary = flightOffer.itineraries[0].segments[0];
    const mailOptions = {
        from: `Flight Notifier <${emailUser}>`,
        to: recipientEmail,
        subject: `Flight Found Immediately: ${itinerary.carrierCode}${itinerary.number}!`,
        html: `<h1>Matching Flight Found!</h1><p>A flight matching your search was found immediately.</p><h3>Flight Details:</h3><ul><li><strong>Flight:</strong> ${itinerary.carrierCode} ${itinerary.number}</li><li><strong>From:</strong> ${itinerary.departure.iataCode}</li><li><strong>To:</strong> ${itinerary.arrival.iataCode}</li></ul>`,
    };
    await transporter.sendMail(mailOptions);
}


// --- Main Server Action ---

export async function trackFlightAction(prevState: FormState, formData: FormData): Promise<FormState> {
  // 1. Validate form data
  const validatedFields = flightRequestSchema.safeParse({
    submitted_by: formData.get('email'),
    target_booking_class: formData.get('bookingClass'),
    search_query_str: formData.get('query')
  });

  if (!validatedFields.success) {
    return { status: 'error', message: 'Invalid form data.' };
  }
  const { submitted_by, target_booking_class, search_query_str } = validatedFields.data;
  const search_query = JSON.parse(search_query_str);

  // 2. Perform IMMEDIATE check
  console.log('⚡ Performing immediate check for request from:', submitted_by);
  const token = await getAmadeusToken();
  if (!token) {
    return { status: 'error', message: 'Could not authenticate with Amadeus. Please try again later.' };
  }

  const foundFlight = await searchForFlightOnce(token, search_query, target_booking_class);

  // 3. Decide what to do and LOG EVERYTHING to the database
  if (foundFlight) {
    // SUCCESS: Found it. Log as 'notified' and send email.
    console.log('✅ Immediate match found! Saving as NOTIFIED and sending email.');
    
    await supabase.from('flight_requests').insert([{
        submitted_by,
        search_query,
        target_booking_class,
        status: 'notified', // Set final status immediately
        last_checked_at: new Date().toISOString()
    }]);

    await sendImmediateNotification(submitted_by, foundFlight);
    
    return {
      status: 'success',
      message: 'Success! A matching flight was found immediately and a notification has been sent.'
    };
  } else {
    // QUEUE: Not found. Log as 'active' for the worker.
    console.log('❌ No immediate match. Saving as ACTIVE for background worker.');

    await supabase.from('flight_requests').insert([{
        submitted_by,
        search_query,
        target_booking_class,
        status: 'active' // Set status for worker to pick up
    }]);

    return {
        status: 'queued',
        message: 'Flight not available right now. Your request has been queued and will be checked every 5 minutes.'
    };
  }
}
