import { Alert, Button, Card, Col, Row } from 'react-bootstrap';
import { Link } from 'react-router-dom';

import { facilityLook } from '../lib/facilityLook.js';

/* A single tile representing a facility type, showing its availability and required equipment. */
function FacilityTile({ type, user }) {
  const look = facilityLook(type.name);
  const soldOut = type.available === 0;

  const destination = user ? `/reservations/new?type=${type.id}` : '/login';

  return (
    <Button
      as={Link}
      to={destination}
      variant="light"
      className="gf-tile d-flex flex-column gap-2 w-100 text-start text-decoration-none"
      disabled={soldOut}
    >
      <div className="d-flex justify-content-between align-items-start w-100">
        <span className="gf-tile-icon">
          <i className={`bi ${look.icon}`} aria-hidden="true" />
        </span>

        <div className="text-end">
          <div className={soldOut ? 'gf-count is-empty' : 'gf-count'}>
            {type.available}
            <span className="fs-6 gf-muted">/{type.total}</span>
          </div>
          <div className="gf-muted small">available now</div>
        </div>
      </div>

      <div>
        <h3 className="h6 mb-1">{type.name}</h3>
        <p className="gf-muted small mb-0">{look.blurb}</p>
      </div>

      {type.equipmentRules?.length > 0 && (
        <p className="small gf-muted mb-0">
          <strong>Required:</strong>{' '}
          {type.equipmentRules
            .filter((rule) => rule.mandatory)
            .map((rule) => `${rule.name} ×${rule.minimumQuantity}`)
            .join(', ') || 'none'}
        </p>
      )}
    </Button>
  );
}

/* The home page, showing the public availability of facilities and equipment. */
function HomePage({ user, facilityTypes, equipment, error, onRefresh }) {

  const minimumByEquipmentId = {};

  for (const type of facilityTypes) {
    for (const rule of type.equipmentRules ?? []) {
      if (rule.mandatory) {
        const currentMinimum =
          minimumByEquipmentId[rule.equipmentTypeId] ?? 0;

        minimumByEquipmentId[rule.equipmentTypeId] = Math.max(
          currentMinimum,
          rule.minimumQuantity
        );
      }
    }
  }

  return (
    <>
      <section className="gf-hero mb-4">
        <p className="gf-eyebrow text-white-50">NEXUS</p>
        <h1 className="mb-3">Reconnect. Move. Evolve.</h1>
        <p className="mb-4 opacity-75" style={{ maxWidth: '52ch' }}>
          Check what is free right now, then reserve a facility together with all the gear you
          need. Everything can be rented on site, so you only bring yourself.
        </p>

        <div className="d-flex flex-wrap gap-2">
          {user ? (
            <Button
              as={Link}
              to="/reservations/new"
              variant="light"
              className="rounded-pill fw-semibold"
            >
              Book a facility
            </Button>
          ) : (
            <Button
              as={Link}
              to="/login"
              variant="light"
              className="rounded-pill fw-semibold"
            >
              Sign in to book
            </Button>
          )}

          <Button
            variant="outline-light"
            className="rounded-pill"
            onClick={onRefresh}
          >
            <i className="bi bi-arrow-clockwise me-1" aria-hidden="true" />
            Refresh availability
          </Button>
        </div>
      </section>

      {error && (
        <Alert variant="danger" className="rounded-4">
          {error}
        </Alert>
      )}

      <section className="mb-5">
        <div className="d-flex align-items-end justify-content-between mb-3">
          <div>
            <p className="gf-eyebrow mb-1">Facilities</p>
            <h2 className="h4 mb-0">Available units by type</h2>
          </div>
        </div>

        <Row xs={1} sm={2} lg={3} className="g-3">
          {facilityTypes.map((type) => (
            <Col key={type.id}>
              <FacilityTile type={type} user={user} />
            </Col>
          ))}
        </Row>

        {facilityTypes.length === 0 && !error && (
          <p className="gf-muted">Loading facilities…</p>
        )}
      </section>

      <section>
        <p className="gf-eyebrow mb-1">Rental gear</p>
        <h2 className="h4 mb-3">Equipment available across the center</h2>

        <Card className="gf-card">
          <Card.Body>
            <Row xs={1} sm={2} lg={3} className="g-3">
              {equipment.map((item) => {
                const minimum = minimumByEquipmentId[item.id] ?? 0;
                const belowMinimum =
                  item.available > 0 &&
                  minimum > 0 &&
                  item.available < minimum;
                return (
                  <Col key={item.id}>
                    <div className="d-flex justify-content-between align-items-center gf-light-panel">
                      <span className="fw-semibold">{item.name}</span>
                      <span
                        className={
                          item.available === 0
                            ? 'gf-count is-empty fs-5'
                            : belowMinimum
                              ? 'gf-count is-low fs-5'
                              : 'gf-count fs-5'
                        }
                      >
                        {item.available}
                        <span className="fs-6 gf-muted">
                          /{item.total_quantity}
                        </span>
                      </span>
                    </div>
                  </Col>
                );
              })}
            </Row>

            {equipment.length === 0 && !error && (
              <p className="gf-muted mb-0">Loading equipment…</p>
            )}
          </Card.Body>
        </Card>
      </section>
    </>
  );
}

export default HomePage;