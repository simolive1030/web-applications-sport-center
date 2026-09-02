import { Button, Form } from 'react-bootstrap';

/**
 * The component for rendering one row per equipment type of a facility, with a bounded quantity
 * selector. Rows are fully computed by the parent (min, max, note), this
 * component only presents them and reports changes.
 */
function EquipmentPicker({ rows, onChange }) {
  return (
    <div>
      {rows.map((row) => {
        const canDecrease = row.value > row.min;
        const canIncrease = row.value < row.max;
        return (
          <div
            key={row.id}
            className="gf-equipment-row d-flex flex-wrap align-items-center justify-content-between gap-2"
          >
            <div>
              <div className="fw-semibold">
                {row.name}{' '}
                {row.mandatory ? (
                  <span className="gf-chip ms-1">min {row.min}</span>
                ) : (
                  <span className="gf-chip ms-1">optional</span>
                )}
              </div>
              {row.note && <div className="small gf-muted">{row.note}</div>}
            </div>

            <div className="d-flex align-items-center gap-2">
              <Button
                variant="outline-secondary"
                size="sm"
                aria-label={`Remove one ${row.name}`}
                disabled={!canDecrease}
                onClick={() => onChange(row.id, row.value - 1)}
              >
                <i className="bi bi-dash-lg" aria-hidden="true" />
              </Button>
              <Form.Control
                type="number"
                className="text-center"
                style={{ width: '5rem' }}
                min={row.min}
                max={row.max}
                value={row.value}
                aria-label={`Quantity of ${row.name}`}
                onChange={(event) => {
                  const raw = event.target.value;
                  if (raw === '') {
                    onChange(row.id, row.min);
                    return;
                  }
                  const parsed = Number.parseInt(raw, 10);
                  // Let the user type freely (including transient out-of-range
                  // digits while composing a multi-digit number); the value is
                  // clamped to [min, max] on blur, not on every keystroke.
                  if (!Number.isNaN(parsed)) onChange(row.id, parsed);
                }}
                onBlur={(event) => {
                  const parsed = Number.parseInt(event.target.value, 10);
                  const clamped = Number.isNaN(parsed)
                    ? row.min
                    : Math.min(row.max, Math.max(row.min, parsed));
                  onChange(row.id, clamped);
                }}
              />
              <Button
                variant="outline-secondary"
                size="sm"
                aria-label={`Add one ${row.name}`}
                disabled={!canIncrease}
                onClick={() => onChange(row.id, row.value + 1)}
              >
                <i className="bi bi-plus-lg" aria-hidden="true" />
              </Button>
            </div>
          </div>
        );
      })}
      {rows.length === 0 && <p className="gf-muted mb-0">No equipment is associated with this facility.</p>}
    </div>
  );
}

export default EquipmentPicker;