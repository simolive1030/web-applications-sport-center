
import express from 'express';
import morgan from 'morgan';  // logging middleware
import cors from 'cors';

/** Authentication-related imports **/
import passport from 'passport';                              // authentication middleware
import LocalStrategy from 'passport-local';                   // authentication strategy (username and password)

import { TOTP } from 'otpauth';

import db from './src/config/db.mjs';
import userDao from './src/dao/dao-users.mjs'; // module for accessing the user table in the DB
import reservationDao from './src/dao/dao-reservations.mjs'; // module for accessing the reservations table in the DB
// Importing service functions for reservation management
import { createReservation, updateReservationEquipment, deleteReservation } from './src/services/reservation-service.mjs';


/*** init express and set-up the middlewares ***/
const app = express();
app.use(morgan('dev'));
app.use(express.json());


/** Set up and enable Cross-Origin Resource Sharing (CORS) **/
const corsOptions = {
  origin: 'http://localhost:5173',
  credentials: true,
};
app.use(cors(corsOptions));

// Public routes (no authentication required) for reading facilities and equipment availability
app.get('/api/facilities', async (req, res) => {
  try {
    const rows = await db.all(`
      SELECT ft.id, ft.name,
             COUNT(f.id) AS total,
             COUNT(f.id) - COUNT(r.id) AS available
      FROM facility_types ft
      JOIN facilities f ON f.facility_type_id = ft.id
      LEFT JOIN reservations r
        ON r.facility_id = f.id AND r.deleted_at IS NULL
      GROUP BY ft.id
    `);

    // Rules for equipment associated with each facility type, including minimum quantity and whether it's mandatory
    const ruleRows = await db.all(`
      SELECT fe.facility_type_id AS facilityTypeId,
             et.id AS equipmentTypeId, et.name,
             fe.minimum_quantity AS minimumQuantity
      FROM facility_equipment fe
      JOIN equipment_types et ON et.id = fe.equipment_type_id
      ORDER BY fe.facility_type_id, fe.minimum_quantity DESC, et.name
    `);
    const rulesByTypeId = new Map();
    for (const rule of ruleRows) {
      if (!rulesByTypeId.has(rule.facilityTypeId)) rulesByTypeId.set(rule.facilityTypeId, []);
      rulesByTypeId.get(rule.facilityTypeId).push({
        equipmentTypeId: rule.equipmentTypeId,
        name: rule.name,
        minimumQuantity: rule.minimumQuantity,
        mandatory: rule.minimumQuantity > 0,
      });
    }

    res.json(rows.map((r) => ({ ...r, equipmentRules: rulesByTypeId.get(r.id) || [] })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// List of facilities for a given facility type, with their availability
app.get('/api/facility-types/:id/facilities', async (req, res) => {
  try {
    const typeId = Number(req.params.id);
    if (!Number.isInteger(typeId)) return res.status(400).json({ error: 'Invalid facility type id' });

    const type = await db.get('SELECT id FROM facility_types WHERE id = ?', [typeId]);
    if (!type) return res.status(404).json({ error: 'Facility type not found' });

    const rows = await db.all(
      `SELECT f.id, f.code, f.name,
              NOT EXISTS (
                SELECT 1 FROM reservations r WHERE r.facility_id = f.id AND r.deleted_at IS NULL
              ) AS available
       FROM facilities f
       WHERE f.facility_type_id = ?
       ORDER BY f.code`,
      [typeId]
    );
    res.json(rows.map((r) => ({ ...r, available: !!r.available })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// List of equipment types with their total and available quantities
app.get('/api/equipment', async (req, res) => {
  try {
    const rows = await db.all(`
      SELECT et.id, et.name, et.total_quantity,
             et.total_quantity - COALESCE(SUM(
               CASE WHEN r.deleted_at IS NULL THEN re.quantity ELSE 0 END
             ), 0) AS available
      FROM equipment_types et
      LEFT JOIN reservation_equipment re ON re.equipment_type_id = et.id
      LEFT JOIN reservations r ON r.id = re.reservation_id
      GROUP BY et.id
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/*** Passport ***/
// Configure the local strategy for username/password authentication
passport.use(new LocalStrategy(async function verify(username, password, callback) {
  const user = await userDao.getUser(username, password)
  if(!user)
    return callback(null, false, 'Incorrect username or password');  
    
  return callback(null, user);
}));

// Serializing in the session the user object given from LocalStrategy(verify).
passport.serializeUser(function (user, callback) {
  callback(null, user);
});

// Starting from the data in the session, we extract the current (logged-in) user
passport.deserializeUser(function (user, callback) {
  return callback(null, user);
});

/** Creating the session */
import session from 'express-session';

// Set up session management with express-session
app.use(session({
  secret: process.env.SESSION_SECRET || 'development-only-secret',
  resave: false,
  saveUninitialized: false,
}));
app.use(passport.initialize());
app.use(passport.authenticate('session'));

/// Helper function to verify TOTP token
function verifyTotpToken(user, token) {
  const totp = new TOTP({
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: user.secret
  });

  // Validate the provided token with a window of 1 (to allow for slight time discrepancies)
  const delta = totp.validate({ token, window: 1 });
  if (delta === null) {
    return false;
  }

  const currentCounter = totp.counter();  
  const actualStep = currentCounter + delta;

  if (actualStep <= user.lastTotpStep)
    return false;
  
  user.lastTotpStep = actualStep;
  return true;
}

// Middleware to check if the user is authenticated
const isLoggedIn = (req, res, next) => {
  if(req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({error: 'Not authenticated'});
}


// Helper function to extract user information for the client
function clientUserInfo(req) {
  const user=req.user;
	return {id: user.id, username: user.username, score: user.score, canDoTotp: user.secret? true: false, isTotp: req.session.method === 'totp'};
}

// Authenticates user credentials and establishes a new session
app.post('/api/sessions', function(req, res, next) {
  passport.authenticate('local', (err, user, info) => { 
    if (err)
      return next(err);
      if (!user) {
        return res.status(401).json({ error: info});
      }
      req.login(user, (err) => {
        if (err)
          return next(err);
        
        return res.json(clientUserInfo(req));
      });
  })(req, res, next);
});

// This route is used to verify the TOTP code provided by the user during the 2FA process.
app.post('/api/login-totp', isLoggedIn,
  async (req, res) => {
    if (!req.user.secret) {
      console.log('TOTP not enabled for this user');
      return res.status(400).json({ error: 'Cannot authenticate with TOTP'});
    }
    const success = verifyTotpToken(req.user, req.body.code);
    if (success) {
      req.session.method = 'totp';
      try {
        await userDao.updateLastTotpStepAndResetScore(req.user.id, req.user.lastTotpStep);
        req.user.score = 0;
      } catch (err) {
        console.log(err);
        return res.status(503).json({ error: 'Database error' });
      }
      return res.json({otp: 'authorized'});
    } else {
      console.log('Invalid or replayed TOTP code');
      return res.status(401).json({ error: 'Invalid or replayed TOTP code' });
    }
  }
);

// Route to get the current session's user information
app.get('/api/sessions/current', (req, res) => {
  if(req.isAuthenticated()) {
    res.status(200).json(clientUserInfo(req));}
  else
    res.status(401).json({error: 'Not authenticated'});
});

// Route to log out the current user and destroy the session
app.delete('/api/sessions/current', (req, res) => {
  req.logout(() => {
    res.status(200).json({});
  });
});

// Route to get all active reservations for the logged-in user
app.get('/api/reservations', isLoggedIn, async (req, res) => {
  try {
    const reservations = await reservationDao.getReservationsByUser(req.user.id);
    res.json(reservations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Route to create a new reservation for the logged-in user
app.post('/api/reservations', isLoggedIn, async (req, res) => {
  try {
    const reservation = await createReservation(req.user.id, req.body);
    res.status(201).json(reservation);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Route to update the equipment for a specific reservation of the logged-in user
app.patch('/api/reservations/:id', isLoggedIn, async (req, res) => {
  try {
    const reservationId = Number(req.params.id);
    if (!Number.isInteger(reservationId)) return res.status(400).json({ error: 'Invalid reservation id' });
    const result = await updateReservationEquipment(req.user.id, reservationId, req.body.equipment);
    res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Route to delete a specific reservation of the logged-in user
app.delete('/api/reservations/:id', isLoggedIn, async (req, res) => {
  try {
    const reservationId = Number(req.params.id);
    if (!Number.isInteger(reservationId)) return res.status(400).json({ error: 'Invalid reservation id' });
    await deleteReservation(req.user.id, reservationId);
    req.user.score -= 1; // rispecchia in sessione il decremento fatto dal trigger nel DB
    res.status(200).json({});
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start the server and listen on port 3001
const PORT = 3001;
app.listen(PORT, (err) => {
  if (err)
    console.log(err);
  else 
    console.log(`Server listening at http://localhost:${PORT}`);
}); 
