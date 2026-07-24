// @ts-nocheck
import { badRequest, isEmail, ok } from "@/lib/api";
import { forbidden, getLocalState, isAdminRequest, newId, saveLocalState } from "@/lib/cms";
import {
  createBookingInPostgres,
  listBookingsFromPostgres,
  updateBookingInPostgres
} from "@/lib/cms-db";
import { getSupabaseServer } from "@/lib/supabase";

export async function GET(request) {
  if (!isAdminRequest(request)) {
    return forbidden();
  }

  if (process.env.DATABASE_URL) {
    try {
      return ok({ bookings: await listBookingsFromPostgres(), source: "postgres" });
    } catch (error) {
      console.error("Unable to read PostgreSQL bookings:", error);
      return Response.json({ error: "Unable to load bookings." }, { status: 500 });
    }
  }

  const supabase = getSupabaseServer();

  if (!supabase) {
    const state = await getLocalState();
    return ok({ bookings: state.bookings, source: "local" });
  }

  const { data, error } = await supabase.from("table_bookings").select("*").order("created_at", { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return ok({ bookings: data, source: "supabase" });
}

export async function POST(request) {
  const body = await request.json();
  const guests = Number(body.guests);

  if (!body.customer_name || !body.phone || !body.booking_date || !body.booking_time || !guests) {
    return badRequest("Name, phone, date, time, and guests are required.");
  }

  if (body.email && !isEmail(body.email)) {
    return badRequest("Please enter a valid email address.");
  }

  const booking = {
    customer_name: body.customer_name,
    phone: body.phone,
    email: body.email || null,
    booking_date: body.booking_date,
    booking_time: body.booking_time,
    guests,
    notes: body.notes || null,
    status: "pending"
  };

  if (process.env.DATABASE_URL) {
    try {
      const savedBooking = await createBookingInPostgres(booking);
      return ok({ message: "Booking request sent. We will confirm soon.", booking: savedBooking }, 201);
    } catch (error) {
      console.error("Unable to create PostgreSQL booking:", error);
      return Response.json({ error: "Unable to send the booking request." }, { status: 500 });
    }
  }

  const supabase = getSupabaseServer();

  if (!supabase) {
    const state = await getLocalState();
    const savedBooking = {
      id: newId("booking"),
      ...booking,
      created_at: new Date().toISOString()
    };
    await saveLocalState({ ...state, bookings: [savedBooking, ...state.bookings] });
    return ok({ message: "Booking request sent. We will confirm soon.", booking: savedBooking }, 201);
  }

  const { data, error } = await supabase.from("table_bookings").insert(booking).select().single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return ok({ message: "Booking request sent. We will confirm soon.", booking: data }, 201);
}

export async function PATCH(request) {
  if (!isAdminRequest(request)) {
    return forbidden();
  }

  const body = await request.json();

  if (!body.id || !body.status) {
    return badRequest("Booking id and status are required.");
  }

  if (process.env.DATABASE_URL) {
    try {
      const booking = await updateBookingInPostgres(body.id, body.status);
      if (!booking) return Response.json({ error: "Booking not found." }, { status: 404 });
      return ok({ message: "Booking updated.", booking, source: "postgres" });
    } catch (error) {
      console.error("Unable to update PostgreSQL booking:", error);
      return Response.json({ error: "Unable to update booking." }, { status: 500 });
    }
  }

  const supabase = getSupabaseServer();

  if (!supabase) {
    const state = await getLocalState();
    const bookings = state.bookings.map((booking) =>
      booking.id === body.id ? { ...booking, status: body.status, updated_at: new Date().toISOString() } : booking
    );
    await saveLocalState({ ...state, bookings });
    return ok({ message: "Booking updated locally.", bookings, source: "local" });
  }

  const { data, error } = await supabase
    .from("table_bookings")
    .update({ status: body.status, updated_at: new Date().toISOString() })
    .eq("id", body.id)
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return ok({ message: "Booking updated.", booking: data, source: "supabase" });
}

