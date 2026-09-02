import { Button, Modal, Spinner } from 'react-bootstrap';

/* The modal for confirming the deletion of a reservation. */
function ConfirmDeleteModal({ show, reservation, waiting, onCancel, onConfirm }) {
  return (
    <Modal show={show} onHide={onCancel} centered>
      <Modal.Header closeButton>
        <Modal.Title className="h5">Release this facility?</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="mb-2">
          <strong>
            {reservation?.facilityCode} · {reservation?.facilityName}
          </strong>{' '}
          and all its equipment will become available to everybody again.
        </p>
        <p className="gf-muted small mb-0">
          Deleting a reservation lowers your personal score by 1, and you will not be able to book
          the same type of facility again for 30 seconds.
        </p>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onCancel} disabled={waiting}>
          Keep it
        </Button>
        <Button variant="danger" className="rounded-pill fw-semibold" onClick={onConfirm} disabled={waiting}>
          {waiting ? <Spinner animation="border" size="sm" /> : 'Delete reservation'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default ConfirmDeleteModal;
