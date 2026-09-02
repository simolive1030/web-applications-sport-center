
import db from '../config/db.mjs';

// Returns all active reservations for a given user, including the equipment reserved for each reservation.
const getReservationsByUser = async (userId) => {
  
  // First query: all active reservations of the user
  const reservationRows = await db.all(
    `SELECT r.id AS reservationId, r.created_at AS createdAt,
            f.code AS facilityCode, f.name AS facilityName,
            ft.id AS facilityTypeId, ft.name AS facilityType
     FROM reservations r
     JOIN facilities f ON f.id = r.facility_id
     JOIN facility_types ft ON ft.id = f.facility_type_id
     WHERE r.user_id = ? AND r.deleted_at IS NULL
     ORDER BY r.created_at`,
    [userId]
  );

  if (reservationRows.length === 0) return [];

  // Second query: all the equipment for all active reservations
  // of the user in a single call.
  const equipmentRows = await db.all(
    `SELECT re.reservation_id AS reservationId,
            et.id AS equipmentTypeId, et.name AS equipmentName, re.quantity
     FROM reservation_equipment re
     JOIN reservations r ON r.id = re.reservation_id
     JOIN equipment_types et ON et.id = re.equipment_type_id
     WHERE r.user_id = ? AND r.deleted_at IS NULL`,
    [userId]
  );

  // Group the equipment by reservationId for easier mapping
  const equipmentByReservation = new Map();
  for (const row of equipmentRows) {
    if (!equipmentByReservation.has(row.reservationId)) {
      equipmentByReservation.set(row.reservationId, []);
    }
    equipmentByReservation.get(row.reservationId).push({
      equipmentTypeId: row.equipmentTypeId,
      name: row.equipmentName,
      quantity: row.quantity,
    });
  }

  return reservationRows.map((r) => ({
    id: r.reservationId,
    createdAt: r.createdAt,
    facilityCode: r.facilityCode,
    facilityName: r.facilityName,
    facilityTypeId: r.facilityTypeId,
    facilityType: r.facilityType,
    equipment: equipmentByReservation.get(r.reservationId) || [],
  }));
};

export default {
  getReservationsByUser,
};
