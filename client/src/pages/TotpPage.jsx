import { useState } from 'react';
import { Alert, Button, Card, Form, Spinner } from 'react-bootstrap';

/* The page for entering a TOTP code, allowing the user to verify their identity with two-factor authentication. */
function TotpPage({ user, onVerify, onSkip }) {

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [waiting, setWaiting] = useState(false);

  const valid = /^\d{6}$/.test(code);

  const handleSubmit = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    setError('');
    if (!valid) {
      setError('The code must be exactly 6 digits.');
      return;
    }
    setWaiting(true);
    try {
      await onVerify(code);
    } catch (err) {
      setError(err.message);
      setCode('');
      setWaiting(false);
    }
  };

  return (
    <Card className="gf-card gf-auth-card">
      <Card.Body className="p-4">
        <p className="gf-eyebrow mb-1">Second factor</p>
        <h1 className="h4 mb-1">Hi {user.username}, confirm it&apos;s you</h1>
        <p className="gf-muted small">
          Enter the 6-digit code from your authenticator app. It changes every 30 seconds.
        </p>

        {error && (
          <Alert variant="danger" className="rounded-4" onClose={() => setError('')} dismissible>
            {error}
          </Alert>
        )}

        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3" controlId="totp-code">
            <Form.Label>Authentication code</Form.Label>
            <Form.Control
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              className="text-center fs-4 letter-spacing"
              onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
            />
          </Form.Group>

          <div className="d-grid gap-2">
            <Button type="submit" variant="primary" disabled={waiting || !valid}>
              {waiting ? <Spinner animation="border" size="sm" /> : 'Verify code'}
            </Button>
            <Button type="button" variant="outline-secondary" onClick={onSkip} disabled={waiting}>
              Continue without two-factor
            </Button>
          </div>
        </Form>

        {user.score < 0 && (
          <p className="small mt-3 mb-0 gf-chip is-warn">
            Your score is {user.score}: verifying the code brings it back to 0.
          </p>
        )}
      </Card.Body>
    </Card>
  );
}

export default TotpPage;
