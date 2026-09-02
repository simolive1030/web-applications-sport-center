import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';

import API from './API.js';
import Layout from './components/Layout.jsx';
import HomePage from './pages/HomePage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import TotpPage from './pages/TotpPage.jsx';
import ReservationsPage from './pages/ReservationsPage.jsx';
import NewReservationPage from './pages/NewReservationPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

function App() {
  
  /* Session */
  const [user, setUser] = useState(null);
  const [sessionChecked, setSessionChecked] = useState(false);

  /* Public availability data, shared by every view */
  const [facilityTypes, setFacilityTypes] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [availabilityError, setAvailabilityError] = useState('');

  /* Reservations of the authenticated user */
  const [reservations, setReservations] = useState([]);

  /* Global feedback message shown after every operation */
  const [feedback, setFeedback] = useState(null);
  
  const navigate = useNavigate();

  /* Helper functions to show and dismiss feedback messages */
  const notify = (variant, text) => setFeedback({ variant, text });
  const dismissFeedback = () => setFeedback(null);

  /* Load the public availability data (facility types and equipment) */
  const loadAvailability = async () => {
    try {
      const [types, equip] = await Promise.all([API.getFacilityTypes(), API.getEquipment()]);
      setFacilityTypes(types);
      setEquipment(equip);
      setAvailabilityError('');
    } catch (err) {
      setAvailabilityError(err.message);
    }
  };

  /* Load the reservations of the authenticated user */
  const loadReservations = async () => {
    try {
      setReservations(await API.getReservations());
    } catch (err) {
      if (err.status === 401) {
        setUser(null);
        setReservations([]);
      } else {
        notify('danger', err.message);
      }
    }
  }; 

  /* Refresh the current session user */
  const refreshUser = async () => {
    try {
      setUser(await API.getUserInfo());
    } catch {
      setUser(null);
    }
  };

  /* Everything that a reservation operation can influence */
  const refreshAll = async () => {
    await Promise.all([loadAvailability(), loadReservations(), refreshUser()]);
  };

  /* Initial load: public data + existing session (if any) */
  useEffect(() => {
    loadAvailability();
    API.getUserInfo()
      .then((info) => setUser(info))
      .catch(() => setUser(null))
      .finally(() => setSessionChecked(true));
  }, []);

  /* When a user becomes authenticated, load their reservations */
  useEffect(() => {
    if (user) loadReservations();
    else setReservations([]);
  }, [user]);

  /* Handlers for login and Totp */
  const handleLogin = async (credentials, wantsTotp) => {
    const info = await API.logIn(credentials);
    setUser(info);
    dismissFeedback();
    navigate('/login/totp');
  };

  const handleTotp = async (code) => {
    await API.verifyTotp(code);
    const info = await API.getUserInfo();
    setUser(info);
    notify('success', 'Two-factor authentication completed. Your score is now 0.');
    navigate('/reservations');
  };

  const handleSkipTotp = () => {
    notify('info', `Signed in as ${user?.username} without two-factor authentication.`);
    navigate('/reservations');
  };

  /* Handler for logout */
  const handleLogout = async () => {
    try {
      await API.logOut();
    } catch {
      /* the session is dropped locally in any case */
    }
    setUser(null);
    setReservations([]);
    notify('info', 'You have been signed out.');
    navigate('/');
  };


  return (
    <Layout
      user={user}
      onLogout={handleLogout}
      feedback={feedback}
      onDismissFeedback={dismissFeedback}
    >
      <Routes>
        <Route
          path="/"
          element={
            <HomePage
              user={user}
              facilityTypes={facilityTypes}
              equipment={equipment}
              error={availabilityError}
              onRefresh={loadAvailability}
            />
          }
        />
        <Route
          path="/login"
          element={
            !sessionChecked ? null : user ? (
              user.isTotp ? (
                <Navigate replace to="/reservations" />
              ) : (
                <Navigate replace to="/login/totp" />
              )
            ) : (
              <LoginPage onLogin={handleLogin} />
            )
          }
        />
        <Route
          path="/login/totp"
          element={
            !sessionChecked ? null : !user ? (
              <Navigate replace to="/login" />
            ) : (
              <TotpPage user={user} onVerify={handleTotp} onSkip={handleSkipTotp} />
            )
          }
        />
        <Route
          path="/reservations"
          element={
            !sessionChecked ? null : !user ? (
              <Navigate replace to="/login" />
            ) : (
              <ReservationsPage
                user={user}
                reservations={reservations}
                facilityTypes={facilityTypes}
                equipment={equipment}
                notify={notify}
                onChanged={refreshAll}
              />
            )
          }
        />
        <Route
          path="/reservations/new"
          element={
            !sessionChecked ? null : !user ? (
              <Navigate replace to="/login" />
            ) : (
              <NewReservationPage
                user={user}
                facilityTypes={facilityTypes}
                equipment={equipment}
                notify={notify}
                onRefresh={loadAvailability}
                onCreated={refreshAll}
              />
            )
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Layout>
  );
}

export default App;