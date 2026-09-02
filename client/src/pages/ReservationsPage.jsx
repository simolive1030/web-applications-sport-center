import { useState } from 'react';
import { Alert, Badge, Button, Card, Col, Row } from 'react-bootstrap';
import { Link } from 'react-router-dom';

import API from '../API.js';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal.jsx';
import EditEquipmentModal from '../components/EditEquipmentModal.jsx';
import { facilityLook } from '../lib/facilityLook.js';

/* A single card representing a reservation, showing the facility and equipment. */
function ReservationCard({ reservation, onEdit, onDelete }) {
  const look = facilityLook(reservation.facilityType);
  return (
    <Card className="gf-card h-100">
      <Card.Body className="d-flex flex-column gap-3">
        <div className="d-flex align-items-start justify-content-between gap-2">
          <div className="d-flex align-items-center gap-2">
            <span className="gf-tile-icon">
              <i className={`bi ${look.icon}`} aria-hidden="true" />
            </span>
            <div>
              <h3 className="h6 mb-0">{reservation.facilityName}</h3>
              <span className="small gf-muted">{reservation.facilityType}</span>
            </div>
          </div>
          <Badge bg="success" className="rounded-pill">
            {reservation.facilityCode}
          </Badge>
        </div>

        <ul className="list-unstyled mb-0">
          {reservation.equipment.map((item) => (
            <li key={item.name} className="d-flex justify-content-between py-1 border-bottom">
              <span>{item.name}</span>
              <span className="fw-semibold">×{item.quantity}</span>
            </li>
          ))}
          {reservation.equipment.length === 0 && (
            <li className="gf-muted small">No equipment rented.</li>
          )}
        </ul>

        <div className="mt-auto d-flex flex-wrap gap-2">
          <Button variant="outline-primary" size="sm" onClick={() => onEdit(reservation)}>
            <i className="bi bi-sliders me-1" aria-hidden="true" />
            Change equipment
          </Button>
          <Button variant="outline-danger" size="sm" onClick={() => onDelete(reservation)}>
            <i className="bi bi-trash3 me-1" aria-hidden="true" />
            Delete
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
}

/* The page showing the user's reservations, allowing them to edit or delete them. */
function ReservationsPage({ user, reservations, facilityTypes, equipment, notify, onChanged }) {
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteWaiting, setDeleteWaiting] = useState(false);

  const rulesFor = (reservation) =>
    facilityTypes.find((type) => type.id === reservation.facilityTypeId && type.name === reservation.facilityType)?.equipmentRules ?? [];

  const handleSave = async (reservationId, equipmentList) => {
    await API.updateReservationEquipment(reservationId, equipmentList);
    setEditing(null);
    await onChanged();
    notify('success', 'Reservation updated.');
  };

  const handleDelete = async () => {
    setDeleteWaiting(true);
    try {
      await API.deleteReservation(deleting.id);
      setDeleting(null);
      await onChanged();
      notify('info', 'Reservation deleted. Facility and equipment are available again.');
    } catch (err) {
      setDeleting(null);
      await onChanged();
      notify('danger', err.message);
    } finally {
      setDeleteWaiting(false);
    }
  };

  return (
    <>
      <div className="d-flex flex-wrap align-items-end justify-content-between gap-2 mb-4">
        <div>
          <p className="gf-eyebrow mb-1">Your bookings</p>
          <h1 className="h3 mb-0">My reservations</h1>
        </div>
        <Button as={Link} to="/reservations/new" variant="primary">
          <i className="bi bi-plus-lg me-1" aria-hidden="true" />
          Book a facility
        </Button>
      </div>

      {user.score < 0 && (
        <Alert variant="warning" className="rounded-4">
          Your score is {user.score}: new reservations are limited to the minimum mandatory
          equipment, and existing equipment can only be reduced. Sign out and sign in again with a
          two-factor code to reset your score to 0.
        </Alert>
      )}

      {reservations.length === 0 ? (
        <Card className="gf-card">
          <Card.Body className="text-center p-5">
            <i className="bi bi-calendar2-heart fs-1 text-success" aria-hidden="true" />
            <h2 className="h5 mt-3">Nothing booked yet</h2>
            <p className="gf-muted">Choose a court, a field or a track and we prepare the gear.</p>
            <Button as={Link} to="/reservations/new" variant="primary">
              Book your first facility
            </Button>
          </Card.Body>
        </Card>
      ) : (
        <Row xs={1} md={2} xl={3} className="g-3">
          {reservations.map((reservation) => (
            <Col key={reservation.id}>
              <ReservationCard
                reservation={reservation}
                onEdit={setEditing}
                onDelete={setDeleting}
              />
            </Col>
          ))}
        </Row>
      )}

      {editing && (
        <EditEquipmentModal
          show
          reservation={editing}
          rules={rulesFor(editing)}
          equipment={equipment}
          restricted={user.score < 0}
          onClose={() => setEditing(null)}
          onSave={handleSave}
        />
      )}

      <ConfirmDeleteModal
        show={deleting !== null}
        reservation={deleting}
        waiting={deleteWaiting}
        onCancel={() => setDeleting(null)}
        onConfirm={handleDelete}
      />
    </>
  );
}

export default ReservationsPage;
