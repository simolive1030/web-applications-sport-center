import { Button, Container, Nav, Navbar } from 'react-bootstrap';
import { Link, NavLink } from 'react-router-dom';

import ScoreBadge from './ScoreBadge.jsx';

/* The navigation header, showing the brand, links, and user info. */
function NavHeader({ user, onLogout }) {
  return (
    <Navbar expand="md" className="gf-navbar sticky-top" collapseOnSelect>
      <Container>
        <Navbar.Brand as={Link} to="/" className="gf-brand">
          <span className="gf-brand-mark">
            <img 
              src="../../logo.svg" 
              alt="NEXUS Icon" 
              style={{ width: '24px', height: '24px', verticalAlign: 'middle' }} 
            />
          </span>
          NEXUS
        </Navbar.Brand>

        <Navbar.Toggle aria-controls="gf-nav" />
        <Navbar.Collapse id="gf-nav">
          <Nav className="me-auto">
            <Nav.Link as={NavLink} to="/" end className="gf-navlink">
              Availability
            </Nav.Link>
            {user && (
              <>
                <Nav.Link as={NavLink} to="/reservations" end className="gf-navlink">
                  My reservations
                </Nav.Link>
                <Nav.Link as={NavLink} to="/reservations/new" className="gf-navlink">
                  Book a facility
                </Nav.Link>
              </>
            )}
          </Nav>

          <Nav className="align-items-md-center gap-2">
            {user ? (
              <>
                <span className="gf-chip">
                  <i className="bi bi-person-circle" aria-hidden="true" />
                  {user.username}
                </span>
                <ScoreBadge score={user.score} isTotp={user.isTotp} />
                <Button variant="outline-secondary" size="sm" onClick={onLogout}>
                  Sign out
                </Button>
              </>
            ) : (
              <Button as={Link} to="/login" variant="primary" size="sm">
                Sign in
              </Button>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default NavHeader;
