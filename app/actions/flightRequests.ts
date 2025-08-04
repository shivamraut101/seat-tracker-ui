"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function getFlightRequests(status: string = "All") {
  try {
    let query = supabase
      .from("flight_requests")
      .select("*")
      .order("submitted_at", { ascending: false });

    if (status && status !== "All") {
      query = query.eq("status", status.toLowerCase());
    }

    const { data, error } = await query;
    if (error) throw new Error(`Failed to fetch flight requests: ${error.message}`);
    return data || [];
  } catch (error) {
    console.error("Error in getFlightRequests:", error);
    throw error;
  }
}

export async function updateFlightRequestStatus(id: string, status: string) {
  try {
    const { data, error } = await supabase
      .from("flight_requests")
      .update({ status })
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(`Failed to update status: ${error.message}`);
    revalidatePath("/", "page");
    return { success: true, data };
  } catch (error) {
    console.error("Error in updateFlightRequestStatus:", error);
    throw error;
  }
}

export async function updateFlightRequestTraveler(id: string, travelerInfo: any[]) {
  try {
    const { data, error } = await supabase
      .from("flight_requests")
      .update({ traveler_info: travelerInfo })
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(`Failed to update traveler info: ${error.message}`);
    revalidatePath("/", "page");
    return { success: true, data };
  } catch (error) {
    console.error("Error in updateFlightRequestTraveler:", error);
    throw error;
  }
}

export async function updateFlightRequestSearchQuery(id: string, searchQuery: any) {
  try {
    const { data, error } = await supabase
      .from("flight_requests")
      .update({ search_query: searchQuery })
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(`Failed to update search query: ${error.message}`);
    revalidatePath("/", "page");
    return { success: true, data };
  } catch (error) {
    console.error("Error in updateFlightRequestSearchQuery:", error);
    throw error;
  }
}

export async function updateFlightRequestBookingPreferences(id: string, bookingPreferences: any[]) {
  try {
    // Validate array shape
    if (!Array.isArray(bookingPreferences)) throw new Error("bookingPreferences is not an array");
    for (const bp of bookingPreferences) {
      if (
        typeof bp.id === "undefined" ||
        typeof bp.carrierCode !== "string" ||
        typeof bp.bookingClass !== "string" ||
        typeof bp.flightNumber !== "string"
      ) {
        throw new Error("Invalid booking preference object structure");
      }
    }

    const { data, error } = await supabase
      .from("flight_requests")
      .update({ booking_preferences: bookingPreferences })
      .eq("id", id)
      .select()
      .single();
    if (error) {
      console.error("Failed to update booking preferences:", error);
      throw new Error(`Failed to update booking preferences: ${error.message}`);
    }
    revalidatePath("/", "page");
    return { success: true, data };
  } catch (error) {
    console.error("Error in updateFlightRequestBookingPreferences:", error);
    throw error;
  }
}