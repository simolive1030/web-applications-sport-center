import { useEffect } from 'react';
import { Alert, Container } from 'react-bootstrap';

import NavHeader from './NavHeader.jsx';

/* Application shell: navigation bar, global feedback area, page content, footer. */
function Layout({ user, onLogout, feedback, onDismissFeedback, children }) {
  
  /* Auto-dismiss feedback after 5 seconds */
  useEffect(() => {
    if (!feedback) return undefined;

    const timerId = setTimeout(onDismissFeedback, 5000);
    return () => clearTimeout(timerId);
  }, [feedback, onDismissFeedback]);

  return (
    <div className="d-flex flex-column min-vh-100">
      <NavHeader user={user} onLogout={onLogout} />

      <Container as="main" className="gf-page flex-grow-1">
        {feedback && (
          <Alert
            variant={feedback.variant}
            onClose={onDismissFeedback}
            dismissible
            className="rounded-4"
          >
            {feedback.text}
          </Alert>
        )}
        {children}
      </Container>

      <footer className="gf-footer">
        <Container className="d-flex flex-wrap justify-content-between gap-2 gf-muted">
          <span>NEXUS — Where technology meets nature, movement becomes an experience.</span>
          <span>SYSTEM STATUS: ACTIVE // NATURE: CONNECTED // YOU: READY</span>
        </Container>
      </footer>
    </div>
  );
}

export default Layout;
