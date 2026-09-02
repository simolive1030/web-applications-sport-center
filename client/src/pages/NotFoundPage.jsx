import { Button, Card } from 'react-bootstrap';
import { Link } from 'react-router-dom';

function NotFoundPage() {
  return (
    <Card className="gf-card gf-auth-card text-center">
      <Card.Body className="p-5">
        <i className="bi bi-signpost-2 fs-1 text-success" aria-hidden="true" />
        <h1 className="h4 mt-3">This trail leads nowhere</h1>
        <p className="gf-muted">The page you were looking for does not exist.</p>
        <Button as={Link} to="/" variant="primary">
          Back to availability
        </Button>
      </Card.Body>
    </Card>
  );
}

export default NotFoundPage;
