import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import { useNavigate, useSearchParams } from 'react-router-dom';

import API from '../API.js';
import EquipmentPicker from '../components/EquipmentPicker.jsx';
import { facilityLook } from '../lib/facilityLook.js';

/* Quantities that must be requested for a facility type (mandatory minimums). */
function minimumQuantities(type) {
  const result = {};
  for (const rule of type?.equipmentRules ?? []) {
    if (rule.mandatory) result[rule.equipmentTypeId] = rule.minimumQuantity;
  }
  return result;
}

/** The page for creating a new reservation, allowing the user to choose a facility type,
 *  a unit (if desired), and the required equipment. 
 */
function NewReservationPage({ user, facilityTypes, equipment, notify, onRefresh, onCreated }) {

  const [searchParams] = useSearchParams();
  const initialTypeId = searchParams.get('type');

  const navigate = useNavigate();

  const [typeId, setTypeId] = useState('');
  const [mode, setMode] = useState('auto');
  const [facilityCode, setFacilityCode] = useState('');
  const [units, setUnits] = useState([]);
  const [unitsError, setUnitsError] = useState('');
  const [quantities, setQuantities] = useState({});
  const [formError, setFormError] = useState('');
  const [showStockAlert, setShowStockAlert] = useState(true);
  const [waiting, setWaiting] = useState(false);

  const restricted = user.score < 0;
  const selectedType = facilityTypes.find((type) => String(type.id) === typeId) ?? null;

  const availableById = Object.fromEntries(equipment.map((item) => [item.id, item.available]));

  /* Refresh facility/equipment availability whenever this page is opened. */
  useEffect(() => {
    onRefresh();
  }, []);

  /* If the URL contains a type query parameter, pre-select that type. */
  useEffect(() => {
    if (!initialTypeId || typeId) return;
    const type = facilityTypes.find( (item) => String(item.id) === initialTypeId ) ?? null;
    if (type) {
      setTypeId(initialTypeId);
      setQuantities(minimumQuantities(type));
    }
  }, [facilityTypes]);

  /* Submission errors are transient: close them automatically after a few seconds. */
  useEffect(() => {
    if (!formError) return undefined;

    const timerId = setTimeout(() => setFormError(''), 6000);
    return () => clearTimeout(timerId);
  }, [formError]);

  /* Load the single units of the selected type, only when needed */
  useEffect(() => {
    if (!typeId || mode !== 'direct') {
      setUnits([]);
      return;
    }
    let ignore = false;
    API.getFacilityUnits(typeId)
      .then((list) => {
        if (!ignore) {
          setUnits(list);
          setUnitsError('');
        }
      })
      .catch((err) => {
        if (!ignore) setUnitsError(err.message);
      });
    return () => {
      ignore = true;
    };
  }, [typeId, mode]);

  /* Handlers for the form fields */
  const handleTypeChange = (value) => {
    const type = facilityTypes.find((item) => String(item.id) === value) ?? null;
    setTypeId(value);
    setFacilityCode('');
    setFormError('');
    setShowStockAlert(true);
    setQuantities(minimumQuantities(type));
  };

  const handleQuantityChange = (equipmentTypeId, value) => {
    setQuantities((prev) => ({ ...prev, [equipmentTypeId]: value }));
  };

  /* Build the rows for the equipment picker, including min/max values and notes. */
  const rows = (selectedType?.equipmentRules ?? []).map((rule) => {
    const min = rule.mandatory ? rule.minimumQuantity : 0;
    const stock = availableById[rule.equipmentTypeId] ?? 0;
    const max = restricted ? min : stock;
    const value = quantities[rule.equipmentTypeId] ?? min;
    let note = `${stock} available in the center`;
    if (restricted) note = 'Negative score: only the minimum quantity can be requested';
    else if (stock < min) note = `Only ${stock} left — not enough for the required minimum`;
    return { id: rule.equipmentTypeId, name: rule.name, mandatory: rule.mandatory, min, max, value, note };
  });

  /* Check whether the form can be submitted, and handle the submission. */
  const missingStock = rows.filter((row) => row.min > (availableById[row.id] ?? 0));
  const noFacility = selectedType && selectedType.available === 0;
  const canSubmit =
    selectedType &&
    !noFacility &&
    missingStock.length === 0 &&
    (mode === 'auto' || facilityCode !== '') &&
    !waiting;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');

    if (!selectedType) {
      setFormError('Please choose a facility type.');
      return;
    }
    if (mode === 'direct' && !facilityCode) {
      setFormError('Please choose which unit you want to book.');
      return;
    }

    const payload = {
      mode,
      equipment: rows
        .filter((row) => row.value > 0)
        .map((row) => ({ equipmentTypeId: row.id, quantity: row.value })),
    };
    if (mode === 'direct') payload.facilityCode = facilityCode;
    else payload.facilityTypeId = selectedType.id;

    setWaiting(true);
    try {
      await API.createReservation(payload);
      await onCreated();
      notify('success', `Reservation confirmed for ${selectedType.name}.`);
      navigate('/reservations');
    } catch (err) {
      setFormError(err.message);
      await onCreated(); // availability may have changed meanwhile
      
      // In direct mode also refresh the individual units, otherwise the selected
      // facility could still look available after another user has taken it.
      if (mode === 'direct' && typeId) {
        try {
          const freshUnits = await API.getFacilityUnits(typeId);
          setUnits(freshUnits);
          setUnitsError('');
          const selectedUnitStillAvailable = freshUnits.some(
            (unit) => unit.code === facilityCode && unit.available
          );
          if (!selectedUnitStillAvailable) setFacilityCode('');
        } catch (refreshErr) {
          setUnitsError(refreshErr.message);
        }
      }

      setShowStockAlert(true);
      setWaiting(false);
    }
  };

  return (
    <Row className="g-4">
      <Col lg={7}>
        <Card className="gf-card">
          <Card.Header>New reservation</Card.Header>
          <Card.Body>
            {formError && (
              <Alert variant="danger" className="rounded-4" dismissible onClose={() => setFormError('')}>
                {formError}
              </Alert>
            )}
            {restricted && (
              <Alert variant="warning" className="rounded-4">
                Your score is {user.score}. You can book, but only with the minimum mandatory
                equipment. Sign out and sign in again with a two-factor code to reset it.
              </Alert>
            )}

            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3" controlId="facility-type">
                <Form.Label>Facility type</Form.Label>
                <Form.Select value={typeId} onChange={(event) => handleTypeChange(event.target.value)}>
                  <option value="">Choose a facility type…</option>
                  {facilityTypes.map((type) => (
                    <option key={type.id} value={type.id} disabled={type.available === 0}>
                      {type.name} — {type.available} of {type.total} free
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>

              {selectedType && (
                <>
                  <Form.Group className="mb-3">
                    <Form.Label>How should the unit be chosen?</Form.Label>
                    <div className="d-flex flex-wrap gap-3">
                      <Form.Check
                        type="radio"
                        id="mode-auto"
                        name="mode"
                        label="Let the center assign a free unit"
                        checked={mode === 'auto'}
                        onChange={() => {
                          setMode('auto');
                          setFacilityCode('');
                        }}
                      />
                      <Form.Check
                        type="radio"
                        id="mode-direct"
                        name="mode"
                        label="Pick the unit myself"
                        checked={mode === 'direct'}
                        onChange={() => setMode('direct')}
                      />
                    </div>
                  </Form.Group>

                  {mode === 'direct' && (
                    <Form.Group className="mb-3" controlId="facility-unit">
                      <Form.Label>Available units</Form.Label>
                      {unitsError && (
                        <Alert
                          variant="danger"
                          className="rounded-4"
                          dismissible
                          onClose={() => setUnitsError('')}
                        >
                          {unitsError}
                        </Alert>
                      )}
                      <div className="d-flex flex-wrap gap-2">
                        {units.map((unit) => (
                          <Button
                            key={unit.id}
                            type="button"
                            variant={facilityCode === unit.code ? 'primary' : 'outline-primary'}
                            size="sm"
                            disabled={!unit.available}
                            onClick={() => setFacilityCode(unit.code)}
                          >
                            {unit.code} · {unit.name}
                            {!unit.available && ' (busy)'}
                          </Button>
                        ))}
                        {units.length === 0 && !unitsError && (
                          <span className="gf-muted small">Loading units…</span>
                        )}
                      </div>
                    </Form.Group>
                  )}

                  <div className="mb-3">
                    <Form.Label className="mb-2">Equipment</Form.Label>
                    <div className="gf-light-panel">
                      <EquipmentPicker rows={rows} onChange={handleQuantityChange} />
                    </div>
                    {!formError && !noFacility && missingStock.length > 0 && showStockAlert && (
                      <Alert
                        variant="danger"
                        className="rounded-4 mt-3 mb-0"
                        dismissible
                        onClose={() => setShowStockAlert(false)}
                      >
                        Not enough equipment available:{' '}
                        {missingStock.map((row) => row.name).join(', ')}. This facility cannot be
                        booked right now.
                      </Alert>
                    )}
                  </div>
                </>
              )}

              <div className="d-flex gap-2">
                <Button type="submit" variant="primary" disabled={!canSubmit}>
                  {waiting ? <Spinner animation="border" size="sm" /> : 'Confirm reservation'}
                </Button>
                <Button variant="outline-secondary" onClick={() => navigate('/reservations')}>
                  Cancel
                </Button>
              </div>
            </Form>
          </Card.Body>
        </Card>
      </Col>

      <Col lg={5}>
        <Card className="gf-card">
          <Card.Header>Summary</Card.Header>
          <Card.Body>
            {selectedType ? (
              <>
                <div className="d-flex align-items-center gap-2 mb-3">
                  <span className="gf-tile-icon">
                    <i className={`bi ${facilityLook(selectedType.name).icon}`} aria-hidden="true" />
                  </span>
                  <div>
                    <div className="fw-semibold">{selectedType.name}</div>
                    <div className="small gf-muted">
                      {mode === 'auto' ? 'Unit assigned by the center' : facilityCode || 'No unit selected yet'}
                    </div>
                  </div>
                </div>
                <ul className="list-unstyled mb-0">
                  {rows
                    .filter((row) => row.value > 0)
                    .map((row) => (
                      <li key={row.id} className="d-flex justify-content-between py-1">
                        <span>{row.name}</span>
                        <span className="fw-semibold">×{row.value}</span>
                      </li>
                    ))}
                </ul>
              </>
            ) : (
              <p className="gf-muted mb-0">
                Pick a facility type to see what is included in your reservation.
              </p>
            )}
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
}

export default NewReservationPage;
