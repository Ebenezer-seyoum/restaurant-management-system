// @ts-nocheck
import { getDbPool, withTransaction } from "@/lib/db";
import { hashPassword } from "@/lib/password";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const settingKeys = [
  "brand",
  "home",
  "about",
  "contact",
  "footer",
  "jazz",
  "seo",
  "menuBoard",
  "bookingPage",
  "loginPage",
  "customerPage"
];

export async function saveSettingsToPostgres(body) {
  const pool = getDbPool();
  if (!pool) return null;

  await withTransaction(async (client) => {
    for (const key of settingKeys) {
      await client.query(
        `insert into public.site_settings (setting_key, setting_value, updated_at)
         values ($1, $2::jsonb, now())
         on conflict (setting_key) do update set
           setting_value = excluded.setting_value,
           updated_at = now()`,
        [key, JSON.stringify(body[key] || {})]
      );
    }
  });
  return true;
}

export async function saveGalleryToPostgres(gallery) {
  const pool = getDbPool();
  if (!pool) return null;

  return withTransaction(async (client) => {
    await client.query("update public.gallery_images set is_active = false");
    const saved = [];

    for (const [index, item] of gallery.entries()) {
      if (!item.image) continue;
      const title = item.title || `Gallery ${index + 1}`;
      let result;
      if (uuidPattern.test(String(item.id || ""))) {
        result = await client.query(
          `update public.gallery_images
           set title = $2, image_url = $3, sort_order = $4, is_active = true
           where id = $1
           returning id, title, image_url`,
          [item.id, title, item.image, index + 1]
        );
      }
      if (!result?.rows[0]) {
        result = await client.query(
          `insert into public.gallery_images (title, image_url, sort_order, is_active)
           values ($1, $2, $3, true)
           returning id, title, image_url`,
          [title, item.image, index + 1]
        );
      }
      saved.push({
        id: result.rows[0].id,
        title: result.rows[0].title,
        image: result.rows[0].image_url
      });
    }
    return saved;
  });
}

export async function listBookingsFromPostgres() {
  const pool = getDbPool();
  if (!pool) return null;
  const { rows } = await pool.query(
    "select * from public.table_bookings order by created_at desc limit 500"
  );
  return rows;
}

export async function createBookingInPostgres(booking) {
  const pool = getDbPool();
  if (!pool) return null;
  const { rows } = await pool.query(
    `insert into public.table_bookings
      (customer_name, phone, email, booking_date, booking_time, guests, notes, status)
     values ($1, $2, $3, $4, $5, $6, $7, 'pending')
     returning *`,
    [
      booking.customer_name,
      booking.phone,
      booking.email,
      booking.booking_date,
      booking.booking_time,
      booking.guests,
      booking.notes
    ]
  );
  return rows[0];
}

export async function updateBookingInPostgres(id, status) {
  const pool = getDbPool();
  if (!pool) return null;
  const { rows } = await pool.query(
    `update public.table_bookings
     set status = $2, updated_at = now()
     where id::text = $1
     returning *`,
    [String(id), status]
  );
  return rows[0] || null;
}

export async function listUsersFromPostgres() {
  const pool = getDbPool();
  if (!pool) return null;
  const { rows } = await pool.query(
    `select id, email, name, phone, role, created_at
     from public.app_users
     order by created_at desc
     limit 500`
  );
  return rows;
}

export async function createUserInPostgres(body) {
  const pool = getDbPool();
  if (!pool) return null;
  const { rows } = await pool.query(
    `insert into public.app_users (email, password_hash, name, phone, role)
     values ($1, $2, $3, $4, 'customer')
     returning id, email, name, phone, role`,
    [
      String(body.email).trim().toLowerCase(),
      hashPassword(String(body.password)),
      String(body.name).trim(),
      body.phone || null
    ]
  );
  return rows[0];
}

export async function listFeedbackFromPostgres() {
  const pool = getDbPool();
  if (!pool) return null;
  const { rows } = await pool.query(
    "select * from public.contact_messages order by created_at desc limit 500"
  );
  return rows;
}

export async function createFeedbackInPostgres(message) {
  const pool = getDbPool();
  if (!pool) return null;
  const { rows } = await pool.query(
    `insert into public.contact_messages (name, phone, email, subject, message, status)
     values ($1, $2, $3, $4, $5, 'new')
     returning *`,
    [message.name, message.phone, message.email, message.subject, message.message]
  );
  return rows[0];
}

export async function updateFeedbackInPostgres(id, status) {
  const pool = getDbPool();
  if (!pool) return null;
  const { rows } = await pool.query(
    `update public.contact_messages
     set status = $2, updated_at = now()
     where id::text = $1
     returning *`,
    [String(id), status]
  );
  return rows[0] || null;
}

