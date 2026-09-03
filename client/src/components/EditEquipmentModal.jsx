import { useEffect, useState } from 'react';
import { Alert, Button, Modal, Spinner } from 'react-bootstrap';

import EquipmentPicker from './EquipmentPicker.jsx';

/* Current quantity by equipment type, taken from the reservation as-is on the server. */
function buildCurrentById(reservation) {
  return Object.fromEntries(
    (reservation?.equipment ?? []).map((item) => [item.equipmentTypeId, item.quantity])
  );
}

/* Starting value for each editable row: whatever is currently reserved (0 if none). */
function buildInitialQuantities(rules, currentById) {
  const state = {};
  for (const rule of rules) state[rule.equipmentTypeId] = currentById[rule.equipmentTypeId] ?? 0;
  return state;
}

/**
 * The modal for modifying the equipment of an existing reservation.
 * The picker bounds mirror the server rules but the
 * final decision always belongs to the server.
 */
function EditEquipmentModal({ show, reservation, rules, equipment, restricted, onClose, onSave }) {
  const [quantities, setQuantities] = useState({});
  const [error, setError] = useState('');
  const [waiting, setWaiting] = useState(false);

  const currentById = buildCurrentById(reservation);

  /* re-seed the form whenever a different reservation is opened in the modal */
  useEffect(() => {
    if (!reservation) return;
    setQuantities(buildInitialQuantities(rules, buildCurrentById(reservation)));
    setError('');
  }, [reservation?.id]);

  const availableById = Object.fromEntries(equipment.map((item) => [item.id, item.available]));

  const rows = rules.map((rule) => {
    const min = rule.mandatory ? rule.minimumQuantity : 0;
    const current = currentById[rule.equipmentTypeId] ?? 0;
    const stock = availableById[rule.equipmentTypeId] ?? 0;
    const max = restricted ? current : current + stock;
    const value = quantities[rule.equipmentTypeId] ?? min;
    return {
      id: rule.equipmentTypeId,
      name: rule.name,
      mandatory: rule.mandatory,
      min,
      max: Math.max(min, max),
      value,
      note: restricted
        ? 'Negative score: quantities can only be reduced'
        : `currently ×${current} · ${stock} more available`,
    };
  });

  const changed = rows.some((row) => row.value !== (currentById[row.id] ?? 0));

  const handleSave = async () => {
    setError('');
    setWaiting(true);
    try {
      await onSave(
        reservation.id,
        rows.filter((row) => row.value > 0).map((row) => ({ equipmentTypeId: row.id, quantity: row.value }))
      );
    } catch (err) {
      setError(err.message);
      setWaiting(false);
    }
  };

  return (
    <Modal show={show} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title className="h5">
          Equipment · {reservation?.facilityCode} {reservation?.facilityName}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && (
          <Alert variant="danger" className="rounded-4" dismissible onClose={() => setError('')}>
            {error}
          </Alert>
        )}
        {restricted && (
          <Alert variant="warning" className="rounded-4">
            With a negative score you may only reduce optional equipment.
          </Alert>
        )}
        <EquipmentPicker
          rows={rows}
          onChange={(id, value) => setQuantities((prev) => ({ ...prev, [id]: value }))}
        />
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onClose} disabled={waiting}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSave} disabled={waiting || !changed}>
          {waiting ? <Spinner animation="border" size="sm" /> : 'Save changes'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default EditEquipmentModal;