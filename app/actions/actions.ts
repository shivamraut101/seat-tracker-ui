"use server";

import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

// --- Configuration ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const emailUser = process.env.EMAIL_USER;
const emailPass = process.env.EMAIL_PASS;

const supabase = createClient(supabaseUrl!, supabaseKey!);

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: emailUser,
    pass: emailPass,
  },
});

// New booking preference schema for array of objects
const bookingPreferenceSchema = z.object({
  id: z.number().int(),
  bookingClass: z.string().min(1, "Booking class is required"),
  flightNumber: z.string().min(1, "Flight number is required"),
  carrierCode: z.string().min(1, "Carrier code is required"),
});
const bookingPreferencesArraySchema = z.array(bookingPreferenceSchema).min(1);

const flightRequestSchema = z.object({
  submitted_by: z.string().email({ message: "Invalid email address." }),
  search_query_str: z.string().refine((val) => {
    try { JSON.parse(val); return true; } catch (e) { return false; }
  }, { message: "Search query must be valid JSON." }),
  traveler_info_str: z.string().refine((val) => {
    try { JSON.parse(val); return true; } catch (e) { return false; }
  }, { message: "Traveler info must be valid JSON." }),
  booking_preferences_str: z.string().refine((val) => {
    try { 
      const arr = JSON.parse(val); 
      bookingPreferencesArraySchema.parse(arr);
      return true;
    } catch (e) { return false; }
  }, { message: "Booking preferences must be a valid array." }),
});

export type FormState = {
  message: string;
  status: "idle" | "success" | "error" | "queued" | "held";
  pnr?: string;
  matchedPreference?: any | null;
};

const baseUrl = process.env.NEXT_PUBLIC_AMADEUS_API?.trim();
const AMADEUS_CLIENT_ID = process.env.AMADEUS_CLIENT_ID!;
const AMADEUS_CLIENT_SECRET = process.env.AMADEUS_CLIENT_SECRET!;

async function getAccessToken(): Promise<string> {
  const url = `${baseUrl}/v1/security/oauth2/token`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: AMADEUS_CLIENT_ID,
      client_secret: AMADEUS_CLIENT_SECRET,
    }),
  });
  if (!response.ok) throw new Error("Failed to obtain Amadeus access token");
  const data = await response.json();
  return data.access_token;
}

// --- Improved matching logic ---
function matchesPreference(offer: any, preference: any): boolean {
  for (const pricing of offer.travelerPricings || []) {
    // Map segmentId -> fare class for this traveler
    const segmentClassMap = new Map();
    for (const fareDetail of pricing.fareDetailsBySegment || []) {
      segmentClassMap.set(String(fareDetail.segmentId), String(fareDetail.class).toUpperCase());
    }
    for (const itin of offer.itineraries || []) {
      for (const seg of itin.segments || []) {
        if (
          String(seg.carrierCode).toUpperCase() === String(preference.carrierCode).toUpperCase() &&
          String(seg.number).toUpperCase() === String(preference.flightNumber).toUpperCase() &&
          segmentClassMap.get(String(seg.id)) === String(preference.bookingClass).toUpperCase()
        ) {
          return true;
        }
      }
    }
  }
  return false;
}

async function bookFlight(
  accessToken: string,
  flightOffer: object,
  travelers: object[]
): Promise<object> {
  const requestBody = {
    data: {
      type: "flight-order",
      flightOffers: [flightOffer],
      travelers,
      ticketingAgreement: {
        option: "DELAY_TO_CANCEL",
        delay: "1D",
      },
    },
  };
  const response = await fetch(`${baseUrl}/v1/booking/flight-orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Flight booking API request failed: ${response.status} - ${errorText}`);
  }
  return await response.json();
}

async function sendPNREmail(
  recipientEmail: string,
  pnr: string,
  booking?: any
) {
  let flightDetailsHTML = "";
  if (booking?.data?.flightOffers && booking.data.flightOffers.length > 0) {
    const offer = booking.data.flightOffers[0];
    if (offer.itineraries && offer.itineraries.length > 0) {
      const seg = offer.itineraries[0].segments[0];
      flightDetailsHTML = `
        <tr><td style="padding:8px"><b>Flight</b></td><td style="padding:8px">${seg.carrierCode} ${seg.number}</td></tr>
        <tr><td style="padding:8px"><b>From</b></td><td style="padding:8px">${seg.departure.iataCode} (${seg.departure.at})</td></tr>
        <tr><td style="padding:8px"><b>To</b></td><td style="padding:8px">${seg.arrival.iataCode} (${seg.arrival.at})</td></tr>
        <tr><td style="padding:8px"><b>Aircraft</b></td><td style="padding:8px">${seg.aircraft.code}</td></tr>
      `;
    }
    if (offer.price) {
      flightDetailsHTML += `
        <tr><td style="padding:8px"><b>Total Price</b></td><td style="padding:8px">${offer.price.total} ${offer.price.currency}</td></tr>
      `;
    }
  }

  let travelerHTML = "";
  if (booking?.data?.travelers && Array.isArray(booking.data.travelers) && booking.data.travelers.length > 0) {
    travelerHTML = booking.data.travelers.map((trav: any, idx: number) => `
      <div>
        <b>Traveler #${idx + 1}:</b>
        <ul>
          <li>Name: ${trav.name?.firstName || ""} ${trav.name?.lastName || ""}</li>
          <li>Date of Birth: ${trav.dateOfBirth || ""}</li>
          <li>Gender: ${trav.gender || ""}</li>
        </ul>
      </div>
    `).join("");
  }

  const mailOptions = {
    from: `Flight Notifier <${emailUser}>`,
    to: recipientEmail,
    subject: `🎫 Ticket Held! Your PNR: ${pnr}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.7;">
        <h1 style="color:#3751a0">Your Ticket is Now Held!</h1>
        <p style="font-size:1.1em">
          Congratulations, your requested flight has been held successfully.<br/>
          <b>Your PNR (Passenger Name Record): <span style="color:#126e3b;font-size:1.25em">${pnr}</span></b>
        </p>
        <h2 style="margin-bottom:0">Flight Details</h2>
        <table style="border-collapse:collapse;width:100%;margin-bottom:16px">${flightDetailsHTML}</table>
        ${travelerHTML ? `<h2 style="margin-bottom:0">Traveler(s) Info</h2>${travelerHTML}` : ""}
        <p>
          <b>Please note:</b> This is a held reservation. To confirm and issue your ticket, proceed with payment as per your agent's instructions or airline policy.<br>
          If you need help or wish to modify your booking, reply to this email.
        </p>
        <div style="margin-top:32px; font-size:0.95em; color:#888">
          <b>This email was generated automatically. Please do not share your PNR with anyone you do not trust.</b>
        </div>
      </div>
    `,
  };
  try {
    await transporter.sendMail(mailOptions);
    console.log(`✉️ PNR notification email sent to ${recipientEmail}.`);
  } catch (error) {
    console.error(`🚨 Failed to send PNR email to ${recipientEmail}:`, error);
  }
}

export async function trackFlightAction(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  // Parse booking preferences
  let bookingPreferences: any[] = [];
  try {
    bookingPreferences = JSON.parse(formData.get("bookingPreferences") as string);
    bookingPreferencesArraySchema.parse(bookingPreferences);
  } catch {
    return { status: "error", message: "Booking preferences not valid." };
  }

  let travelerInfoRaw = formData.get("travelerInfo") as string;
  let traveler_info: any[];
  try {
    traveler_info = JSON.parse(travelerInfoRaw);
  } catch {
    return { status: "error", message: "Traveler info not valid JSON." };
  }

  // Validate form data
  const validatedFields = flightRequestSchema.safeParse({
    submitted_by: formData.get("email"),
    search_query_str: formData.get("query"),
    traveler_info_str: travelerInfoRaw,
    booking_preferences_str: JSON.stringify(bookingPreferences),
  });

  if (!validatedFields.success) {
    return { status: "error", message: "Invalid form data." };
  }
  const { submitted_by, search_query_str } = validatedFields.data;
  const search_query = JSON.parse(search_query_str);

  let token: string;
  try {
    token = await getAccessToken();
  } catch {
    return { status: "error", message: "Could not authenticate with Amadeus. Please try again later." };
  }

  // Fetch flight-offers just once for all preferences
  let flightOffers: any[] = [];
  try {
    const response = await fetch(`${baseUrl}/v2/shopping/flight-offers`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(search_query),
    });
    if (!response.ok) throw new Error("Flight search API request failed");
    const json = await response.json();
    flightOffers = json.data || [];
  } catch (err: any) {
    return { status: "error", message: ("Flight search failed: " + (err?.message ?? err)) };
  }

  let foundFlight: object | null = null;
  let matchedPreference: any | null = null;

  for (const pref of bookingPreferences) {
    for (const offer of flightOffers) {
      if (matchesPreference(offer, pref)) {
        foundFlight = offer;
        matchedPreference = pref;
        break;
      }
    }
    if (foundFlight) break;
  }

  // If a flight was found, book immediately
  if (foundFlight && matchedPreference) {
    try {
      const booking = await bookFlight(token, foundFlight, traveler_info);
      let pnr: string | null = null;
      const associatedRecords = booking?.data?.associatedRecords;
      if (Array.isArray(associatedRecords) && associatedRecords.length > 0) {
        pnr = associatedRecords[0]?.reference || null;
      }
      const { error: insertError } = await supabase.from("flight_requests").insert([{
        submitted_by,
        search_query,
        traveler_info,
        status: "held",
        last_checked_at: new Date().toISOString(),
        pnr_number: pnr,
        booking_preferences: bookingPreferences,
        matched_preference: matchedPreference
      }]);
      if (insertError) {
        console.error("🚨 Supabase insert error (held):", insertError);
      }
      if (pnr) await sendPNREmail(submitted_by, pnr, booking);
      return {
        status: "held",
        message: pnr
          ? `The ticket has been successfully held for your matched preference. PNR: ${pnr}. Confirmation email sent.`
          : `Ticket held, but no PNR returned.`,
        pnr: pnr ?? undefined,
        matchedPreference
      };
    } catch (err) {
      // Insert into Supabase anyway for tracking
      const { error: insertError } = await supabase.from("flight_requests").insert([{
        submitted_by,
        search_query,
        traveler_info,
        status: "error",
        last_checked_at: new Date().toISOString(),
        pnr_number: null,
        booking_preferences: bookingPreferences,
        matched_preference: matchedPreference
      }]);
      if (insertError) {
        console.error("🚨 Supabase insert error (error case):", insertError);
      }
      return {
        status: "error",
        message: "Booking failed (Amadeus API error): " + (err?.message ?? err),
        matchedPreference
      };
    }
  }

  // No match found: save for worker
  const { error: insertError } = await supabase.from("flight_requests").insert([{
    submitted_by,
    search_query,
    traveler_info,
    status: "active",
    last_checked_at: new Date().toISOString(),
    pnr_number: null,
    booking_preferences: bookingPreferences,
    matched_preference: null
  }]);
  if (insertError) {
    console.error("🚨 Supabase insert error (active):", insertError);
  }
  return {
    status: "queued",
    message: "Flight not available right now in any of your preferred options. Your request has been queued for future checking.",
    matchedPreference: null
  };
}