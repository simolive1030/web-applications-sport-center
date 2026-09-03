
import db from '../config/db.mjs';

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/**
 * Creates a new reservation for a user. Handles direct or automatic facility 
 * selection, equipment validation, score-based restrictions, and concurrency control.
 */
export async function createReservation(userId, body) {
  const { mode, facilityCode, facilityTypeId, equipment } = body || {};

  // Step 1: Input payload validation
  if (mode !== 'direct' && mode !== 'auto') {
    throw new ApiError(400, 'Invalid or missing "mode" (expected "direct" or "auto")');
  }
  if (mode === 'direct' && (typeof facilityCode !== 'string' || facilityCode.trim() === '')) {
    throw new ApiError(400, 'Missing or invalid "facilityCode" for direct selection');
  }
  if (mode === 'auto' && !Number.isInteger(facilityTypeId)) {
    throw new ApiError(400, 'Missing or invalid "facilityTypeId" for automatic assignment');
  }

  const equipmentList = Array.isArray(equipment) ? equipment : [];
  const seenEquipmentIds = new Set();

  for (const item of equipmentList) {
    if (!item || !Number.isInteger(item.equipmentTypeId) || !Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw new ApiError(400, 'Each equipment item needs a valid equipmentTypeId and a positive integer quantity');
    }
    if (seenEquipmentIds.has(item.equipmentTypeId)) {
      throw new ApiError(400, 'Duplicate equipment type in the request');
    }
    seenEquipmentIds.add(item.equipmentTypeId);
  }

  // Step 2: Check if the facility (or type, for automatic selection) exists
  let facilityTypeIdForRules;
  let knownFacilityId = null; // known immediately only in "direct" mode

  if (mode === 'direct') {
    const facility = await db.get('SELECT id, facility_type_id FROM facilities WHERE code = ?', [facilityCode]);
    if (!facility) throw new ApiError(404, 'Facility not found');
    facilityTypeIdForRules = facility.facility_type_id;
    knownFacilityId = facility.id;
  } else {
    const type = await db.get('SELECT id FROM facility_types WHERE id = ?', [facilityTypeId]);
    if (!type) throw new ApiError(404, 'Facility type not found');
    facilityTypeIdForRules = facilityTypeId;
  }

  // Step 3: Check for recent cancellations to enforce the 30-second rule
  const recentCancellation = await db.get(
    `SELECT r.deleted_at AS deletedAt,
            CAST(
              strftime('%s', 'now') - strftime('%s', r.deleted_at)
              AS INTEGER
            ) AS elapsedSeconds
    FROM reservations r
    JOIN facilities f ON f.id = r.facility_id
    WHERE r.user_id = ?
      AND f.facility_type_id = ?
      AND r.deleted_at IS NOT NULL
      AND r.deleted_at >= datetime('now', '-30 seconds')
    ORDER BY r.deleted_at DESC
    LIMIT 1`,
    [userId, facilityTypeIdForRules]
  );

  if (recentCancellation) {
    const remainingSeconds = Math.max(
      1,
      30 - recentCancellation.elapsedSeconds
    );

    throw new ApiError(
      409,
      `Too early to reserve this facility type again. Please wait ${remainingSeconds} seconds.`
    );
  }

  // Step 4: Check facility availability before equipment availability.
  if (mode === 'direct') {
    const activeReservation = await db.get(
      `SELECT 1
       FROM reservations
       WHERE facility_id = ?
         AND deleted_at IS NULL
       LIMIT 1`,
      [knownFacilityId]
    );

    if (activeReservation) {
      throw new ApiError(409, 'Facility not available');
    }
  } else {
    const availableFacility = await db.get(
      `SELECT f.id
       FROM facilities f
       WHERE f.facility_type_id = ?
         AND NOT EXISTS (
           SELECT 1
           FROM reservations r
           WHERE r.facility_id = f.id
             AND r.deleted_at IS NULL)
       LIMIT 1`,
      [facilityTypeId]
    );

    if (!availableFacility) {
      throw new ApiError(409,'No facility of this type is currently available'
      );
    }
  }

  // Step 5: Validate equipment against facility rules
  const rules = await db.all(
    `SELECT equipment_type_id, minimum_quantity
     FROM facility_equipment
     WHERE facility_type_id = ?`,
    [facilityTypeIdForRules]
  );

  const minQuantityByEquipmentId = new Map(
    rules.map((r) => [r.equipment_type_id, r.minimum_quantity])
  );

  const requestedQuantityByEquipmentId = new Map(
    equipmentList.map((e) => [e.equipmentTypeId, e.quantity])
  );

  // Check that every requested equipment type is valid for this facility
  for (const item of equipmentList) {
    if (!minQuantityByEquipmentId.has(item.equipmentTypeId)) {
      throw new ApiError(400, `Equipment type ${item.equipmentTypeId} is not valid for this facility`);
    }
  }

  // Check mandatory minimum quantities
  for (const [equipmentTypeId, minQty] of minQuantityByEquipmentId) {
    if (minQty > 0) {
      const requestedQty = requestedQuantityByEquipmentId.get(equipmentTypeId) || 0;
      if (requestedQty < minQty) {
        throw new ApiError(400, `Equipment type ${equipmentTypeId} is mandatory with a minimum quantity of ${minQty}`
        );
      }
    }
  }

  // Step 6: Check user score and enforce restrictions on equipment selection
  const user = await db.get('SELECT score FROM users WHERE id = ?', [userId]);
  if (user.score < 0) {
    for (const item of equipmentList) {
      const minQty = minQuantityByEquipmentId.get(item.equipmentTypeId);
      if (minQty === 0) {
        throw new ApiError(403, 'Your score is negative: optional equipment is not allowed');
      }
      if (item.quantity !== minQty) {
        throw new ApiError(403, 'Your score is negative: only the minimum mandatory quantity is allowed');
      }
    }
  }

  // Step 7: Check global availability of requested equipment
  if (equipmentList.length > 0) {
    const ids = equipmentList.map((e) => e.equipmentTypeId);
    const placeholders = ids.map(() => '?').join(',');
    const availabilityRows = await db.all(
      `SELECT et.id, et.name, et.total_quantity,
              et.total_quantity - COALESCE(SUM(
                CASE WHEN r.deleted_at IS NULL THEN re.quantity ELSE 0 END
              ), 0) AS available
       FROM equipment_types et
       LEFT JOIN reservation_equipment re ON re.equipment_type_id = et.id
       LEFT JOIN reservations r ON r.id = re.reservation_id
       WHERE et.id IN (${placeholders})
       GROUP BY et.id`,
      ids
    );
    const availabilityById = new Map(availabilityRows.map((r) => [r.id, r]));
    for (const item of equipmentList) {
      const info = availabilityById.get(item.equipmentTypeId);
      if (!info || info.available < item.quantity) {
        throw new ApiError(409, `Not enough ${info ? info.name : 'equipment'} available`);
      }
    }
  }

  // Step 8: Atomic reservation insertion (Concurrency Safe) 
  // Availability check is executed inline within the INSERT query (WHERE NOT EXISTS) 
  // to prevent race conditions during concurrent requests.
  let insertedReservation;
  if (mode === 'direct') {
    insertedReservation = await db.get(
      `INSERT INTO reservations (user_id, facility_id, created_at, deleted_at)
       SELECT ?, ?, datetime('now'), NULL
       WHERE NOT EXISTS (
         SELECT 1 FROM reservations WHERE facility_id = ? AND deleted_at IS NULL
       )
       RETURNING id, facility_id`,
      [userId, knownFacilityId, knownFacilityId]
    );
    if (!insertedReservation) throw new ApiError(409, 'Facility not available');
  } else {
    insertedReservation = await db.get(
      `INSERT INTO reservations (user_id, facility_id, created_at, deleted_at)
       SELECT ?, f.id, datetime('now'), NULL
       FROM facilities f
       WHERE f.facility_type_id = ?
         AND NOT EXISTS (
           SELECT 1 FROM reservations r WHERE r.facility_id = f.id AND r.deleted_at IS NULL
         )
       LIMIT 1
       RETURNING id, facility_id`,
      [userId, facilityTypeId]
    );
    if (!insertedReservation) throw new ApiError(409, 'No facility of this type is currently available');
  }

  // Step 9: Attach equipment and manual rollback fallback 
  try {
    for (const item of equipmentList) {
      await db.run(
        `INSERT INTO reservation_equipment (reservation_id, equipment_type_id, quantity)
         VALUES (?, ?, ?)`,
        [insertedReservation.id, item.equipmentTypeId, item.quantity]
      );
    }
  } catch (err) {
    await db.run('DELETE FROM reservation_equipment WHERE reservation_id = ?', [insertedReservation.id]);
    await db.run('DELETE FROM reservations WHERE id = ?', [insertedReservation.id]);
    throw err;
  }

  return { id: insertedReservation.id, facilityId: insertedReservation.facility_id };
}

/**
 * Replaces the entire equipment list of an existing reservation.
 * Expects a complete payload representing the final desired state.
 */
export async function updateReservationEquipment(userId, reservationId, newEquipmentList) {

  // Step 1: Validate input payload
  const equipmentList = Array.isArray(newEquipmentList) ? newEquipmentList : null;
  if (!equipmentList) throw new ApiError(400, 'Missing or invalid "equipment" list');

  const seenEquipmentIds = new Set();
  for (const item of equipmentList) {
    if (!item || !Number.isInteger(item.equipmentTypeId) || !Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw new ApiError(400, 'Each equipment item needs a valid equipmentTypeId and a positive integer quantity');
    }
    if (seenEquipmentIds.has(item.equipmentTypeId)) {
      throw new ApiError(400, 'Duplicate equipment type in the request');
    }
    seenEquipmentIds.add(item.equipmentTypeId);
  }

  // Step 2: Retrieve reservation & ownership verification
  // Combined query checks existence, ownership, and active status.
  // Returns a generic 404 on failure to prevent IDOR vulnerability.
  const reservation = await db.get(
    `SELECT r.id, r.user_id, f.facility_type_id
     FROM reservations r JOIN facilities f ON f.id = r.facility_id
     WHERE r.id = ? AND r.deleted_at IS NULL`,
    [reservationId]
  );
  if (!reservation || reservation.user_id !== userId) {
    throw new ApiError(404, 'Reservation not found');
  }

  // Step 3: No-op check 
  // If the payload is identical to existing items, return early without database modifications.
  // Prevents penalizing reservations created prior to a user score drop if no real changes are made.
  const currentRows = await db.all(
    'SELECT equipment_type_id, quantity FROM reservation_equipment WHERE reservation_id = ?',
    [reservationId]
  );
  const currentByEquipmentId = new Map(currentRows.map((r) => [r.equipment_type_id, r.quantity]));
  const isUnchanged =
    currentByEquipmentId.size === equipmentList.length &&
    equipmentList.every((item) => currentByEquipmentId.get(item.equipmentTypeId) === item.quantity);
  if (isUnchanged) {
    return { id: reservationId };
  }

  // Step 4: Validate facility equipment rules and mandatory minimums
  const rules = await db.all(
    `SELECT equipment_type_id, minimum_quantity FROM facility_equipment WHERE facility_type_id = ?`,
    [reservation.facility_type_id]
  );
  const minQuantityByEquipmentId = new Map(rules.map((r) => [r.equipment_type_id, r.minimum_quantity]));
  const requestedQuantityByEquipmentId = new Map(equipmentList.map((e) => [e.equipmentTypeId, e.quantity]));

  for (const item of equipmentList) {
    if (!minQuantityByEquipmentId.has(item.equipmentTypeId)) {
      throw new ApiError(400, `Equipment type ${item.equipmentTypeId} is not valid for this facility`);
    }
  }
  for (const [equipmentTypeId, minQty] of minQuantityByEquipmentId) {
    if (minQty > 0) {
      const requestedQty = requestedQuantityByEquipmentId.get(equipmentTypeId) || 0;
      if (requestedQty < minQty) {
        throw new ApiError(400, `Equipment type ${equipmentTypeId} is mandatory with a minimum quantity of ${minQty}`);
      }
    }
  }

  // Step 5: Enforce negative score restrictions 
  // Users with negative scores:
  // - Cannot add optional equipment not previously reserved.
  // - Cannot increase quantities beyond current reservation amounts.
  // - Can decrease existing quantities down to mandatory minimums.
  const user = await db.get('SELECT score FROM users WHERE id = ?', [userId]);

  if (user.score < 0) {
    for (const item of equipmentList) {
      const minQty = minQuantityByEquipmentId.get(item.equipmentTypeId);
      const currentQty = currentByEquipmentId.get(item.equipmentTypeId) || 0;

      // Restrict adding new optional equipments
      if (currentQty === 0 && minQty === 0) {
        throw new ApiError(
          403,
          'Your score is negative: optional equipment cannot be added'
        );
      }

      // Restrict increasing quantities beyond current amounts
      if (item.quantity > currentQty) {
        throw new ApiError(
          403,
          'Your score is negative: equipment quantity cannot be increased'
        );
      }
    }
  }

  // Step 6: Global equipment stock check 
  // Calculates global stock excluding allocations from THIS current reservation to avoid self-locking.
  if (equipmentList.length > 0) {
    const ids = equipmentList.map((e) => e.equipmentTypeId);
    const placeholders = ids.map(() => '?').join(',');
    const availabilityRows = await db.all(
      `SELECT et.id, et.name, et.total_quantity,
              et.total_quantity - COALESCE(SUM(
                CASE WHEN r.deleted_at IS NULL AND r.id != ? THEN re.quantity ELSE 0 END
              ), 0) AS available
       FROM equipment_types et
       LEFT JOIN reservation_equipment re ON re.equipment_type_id = et.id
       LEFT JOIN reservations r ON r.id = re.reservation_id
       WHERE et.id IN (${placeholders})
       GROUP BY et.id`,
      [reservationId, ...ids]
    );
    const availabilityById = new Map(availabilityRows.map((r) => [r.id, r]));
    for (const item of equipmentList) {
      const info = availabilityById.get(item.equipmentTypeId);
      if (!info || info.available < item.quantity) {
        throw new ApiError(409, `Not enough ${info ? info.name : 'equipment'} available`);
      }
    }
  }

  // Step 7: Complete replacement of equipment list
  await db.run('DELETE FROM reservation_equipment WHERE reservation_id = ?', [reservationId]);
  for (const item of equipmentList) {
    await db.run(
      `INSERT INTO reservation_equipment (reservation_id, equipment_type_id, quantity) VALUES (?, ?, ?)`,
      [reservationId, item.equipmentTypeId, item.quantity]
    );
  }

  return { id: reservationId };
}

/**
 * Soft deletes a reservation.
 * The database trigger `trg_reservation_soft_delete_score` automatically handles user score reduction.
 */
export async function deleteReservation(userId, reservationId) {
  const result = await db.run(
    `UPDATE reservations SET deleted_at = datetime('now')
     WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
    [reservationId, userId]
  );
  if (result.changes === 0) {
    throw new ApiError(404, 'Reservation not found');
  }
}
