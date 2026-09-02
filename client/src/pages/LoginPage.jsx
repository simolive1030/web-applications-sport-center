import { useState } from 'react';
import { Alert, Button, Card, Form, Spinner } from 'react-bootstrap';

/* The login page, allowing users to sign in with their username and password. */
function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [validated, setValidated] = useState(false);
  const [waiting, setWaiting] = useState(false);

  /* Handler for the login form submission */
  const handleSubmit = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    setError('');

    if (!username.trim() || !password) {
      setValidated(true);
      return;
    }

    setWaiting(true);
    try {
      await onLogin({ username: username.trim(), password });
    } catch (err) {
      setError(err.message);
      setWaiting(false);
    }
  };

  return (
    <Card className="gf-card gf-auth-card">
      <Card.Body className="p-4">
        <p className="gf-eyebrow mb-1">Members area</p>
        <h1 className="h4 mb-3">Sign in</h1>

        {error && (
          <Alert variant="danger" className="rounded-4" onClose={() => setError('')} dismissible>
            {error}
          </Alert>
        )}

        <Form noValidate validated={validated} onSubmit={handleSubmit}>
          <Form.Group className="mb-3" controlId="login-username">
            <Form.Label>Username</Form.Label>
            <Form.Control
              type="text"
              value={username}
              autoComplete="username"
              required
              onChange={(event) => setUsername(event.target.value)}
            />
            <Form.Control.Feedback type="invalid">Please enter your username.</Form.Control.Feedback>
          </Form.Group>

          <Form.Group className="mb-4" controlId="login-password">
            <Form.Label>Password</Form.Label>
            <Form.Control
              type="password"
              value={password}
              autoComplete="current-password"
              required
              onChange={(event) => setPassword(event.target.value)}
            />
            <Form.Control.Feedback type="invalid">Please enter your password.</Form.Control.Feedback>
          </Form.Group>

          <Button type="submit" variant="primary" className="w-100" disabled={waiting}>
            {waiting ? <Spinner animation="border" size="sm" /> : 'Continue'}
          </Button>
        </Form>

        <p className="small gf-muted mt-3 mb-0">
          On the next screen you can enter a two-factor code, or skip it and continue directly.
        </p>
      </Card.Body>
    </Card>
  );
}

export default LoginPage;