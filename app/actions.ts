"use server";

import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

// --- Configuration ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const emailUser = process.env.EMAIL_USER;
const emailPass = process.env.EMAIL_PASS;

// Initialize Supabase client
const supabase = createClient(supabaseUrl!, supabaseKey!);

// Initialize Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: emailUser,
    pass: emailPass,
  },
});

// --- SCHEMAS AND TYPES ---
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
  }, { message: "Search query must be valid JSON." }),
  traveler_info_str: z.string().refine((val) => {
    try {
      JSON.parse(val);
      return true;
    } catch (e) {
      return false;
    }
  }, { message: "Traveler info must be valid JSON." }),
});

export type FormState = {
  message: string;
  status: "idle" | "success" | "error" | "queued" | "held";
  pnr?: string;
};

// --- Amadeus API CLIENT ---
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

async function searchForFlightOnce(
  accessToken: string,
  searchQuery: object,
  targetBookingClass: string
): Promise<object | null> {
  const response = await fetch(`${baseUrl}/v2/shopping/flight-offers`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(searchQuery),
  });
  if (!response.ok) throw new Error("Flight search API request failed");
  const json = await response.json();
  const flightOffers = json.data;
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
}

async function bookFlight(
  accessToken: string,
  flightOffer: object,
  travelers: object[]
): Promise<object> {
  const response = await fetch(`${baseUrl}/v1/booking/flight-orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      data: {
        type: "flight-order",
        flightOffers: [flightOffer],
        travelers,
        ticketingAgreement: {
          option: "DELAY_TO_CANCEL",
          delay: "1D",
        },
      },
    }),
  });
  if (!response.ok) throw new Error("Flight booking API request failed");
  return await response.json();
}

/**
 * Send a detailed HTML email to the user with their held ticket and PNR information.
 */
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

// --- MAIN SERVER ACTION ---

export async function trackFlightAction(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  // 1. Validate form data
  const validatedFields = flightRequestSchema.safeParse({
    submitted_by: formData.get("email"),
    target_booking_class: formData.get("bookingClass"),
    search_query_str: formData.get("query"),
    traveler_info_str: formData.get("travelerInfo"),
  });

  if (!validatedFields.success) {
    return { status: "error", message: "Invalid form data." };
  }
  const { submitted_by, target_booking_class, search_query_str, traveler_info_str } = validatedFields.data;
  const search_query = JSON.parse(search_query_str);
  const traveler_info = JSON.parse(traveler_info_str);
  console.log("Traveler info:", traveler_info);
  // Get flight_number directly from the form, not from query JSON!
  const flight_number = formData.get("flightNumber") as string || null;

  console.log("⚡ Performing immediate check and hold for request from:", submitted_by, "Flight:", flight_number);

  let token: string;
  try {
    token = await getAccessToken();
  } catch (e) {
    return { status: "error", message: "Could not authenticate with Amadeus. Please try again later." };
  }

  let foundFlight: object | null;
  try {
    foundFlight = await searchForFlightOnce(token, search_query, target_booking_class);
  } catch (e) {
    return { status: "error", message: "Flight search failed. See logs for details." };
  }

  if (foundFlight) {
    // Book and hold ticket immediately
    try {
      const booking = await bookFlight(token, foundFlight, traveler_info);

      // Extract PNR (reference) from first associatedRecords[].reference, as per Amadeus API
      let pnr: string | null = null;
      const associatedRecords = booking?.data?.associatedRecords;
      if (Array.isArray(associatedRecords) && associatedRecords.length > 0) {
        pnr = associatedRecords[0]?.reference || null;
      }

      const { error: insertError } = await supabase.from("flight_requests").insert([{
        submitted_by,
        search_query,
        target_booking_class,
        traveler_info,
        status: "held",
        last_checked_at: new Date().toISOString(),
        flight_number,
        pnr_number: pnr,
      }]);
      if (insertError) {
        console.error("🚨 Supabase insert error (held):", insertError);
      }
      if (pnr) await sendPNREmail(submitted_by, pnr, booking);
      return {
        status: "held",
        message: pnr
          ? `The ticket has been successfully held. PNR: ${pnr}. Confirmation email sent.`
          : "Ticket held, but no PNR returned.",
        pnr: pnr ?? undefined,
      };
    } catch {
      return { status: "error", message: "Booking failed. See logs for details." };
    }
  } else {
    // No match: Save as active for worker to check later
    const { error: insertError } = await supabase.from("flight_requests").insert([{
      submitted_by,
      search_query,
      target_booking_class,
      traveler_info,
      status: "active",
      last_checked_at: new Date().toISOString(),
      flight_number,
    }]);
    if (insertError) {
      console.error("🚨 Supabase insert error (active):", insertError);
    }
    return {
      status: "queued",
      message: "Flight not available right now. Your request has been queued and will be checked every 5 minutes.",
    };
  }
}