PRAGMA foreign_keys=OFF;

BEGIN TRANSACTION;

CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    hash TEXT NOT NULL,
    score INTEGER NOT NULL DEFAULT 0 CHECK (score <= 0),
    totp_secret TEXT, 
    password_salt TEXT NOT NULL DEFAULT '', 
    last_totp_step INTEGER
);

INSERT INTO users VALUES(1,'alice','8eb544557e3fd9a2df805fd6be1d2dc3b7f567ffc90e51314a1ab3dcae8b19bc',0,'LXBSMDTMSP2I5XFXIYRGFVWSFI','373acf195fd5692d8a8d8865b6d507b2',NULL);
INSERT INTO users VALUES(2,'bob','ded0a38a4a62af0b134e131590be934304e4bc461cde02d4644654c980632180',0,'LXBSMDTMSP2I5XFXIYRGFVWSFI','032bf08b27d23e676af98c2143fb9e31',NULL);
INSERT INTO users VALUES(3,'carol','7a901445f9388d40cfa584c183dd275797b76fb5dacf8275547e44e96955f65c',-1,'LXBSMDTMSP2I5XFXIYRGFVWSFI','beee530f23e10b4d30a3a0f92f87cb95',NULL);
INSERT INTO users VALUES(4,'dave','06495ba95608a6cad90590d2fc79e14aab84f89c7dca0fe868060ab6b7f42bb3',-2,'LXBSMDTMSP2I5XFXIYRGFVWSFI','eda1de5917d28b0d23e6f4e0df1ba1eb',NULL);


CREATE TABLE equipment_types (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    total_quantity INTEGER NOT NULL CHECK (total_quantity > 0)
);

INSERT INTO equipment_types VALUES(1,'Tennis racket',8);
INSERT INTO equipment_types VALUES(2,'Tennis balls',7);
INSERT INTO equipment_types VALUES(3,'Towel',4);
INSERT INTO equipment_types VALUES(4,'Basketball',2);
INSERT INTO equipment_types VALUES(5,'Cone',4);
INSERT INTO equipment_types VALUES(6,'Volleyball',2);
INSERT INTO equipment_types VALUES(7,'Pair of knee pads',10);
INSERT INTO equipment_types VALUES(8,'Soccer ball',2);
INSERT INTO equipment_types VALUES(9,'Pair of soccer shoes',12);
INSERT INTO equipment_types VALUES(10,'Pair of goalkeeper gloves',2);
INSERT INTO equipment_types VALUES(11,'Table tennis racket',8);
INSERT INTO equipment_types VALUES(12,'Table tennis ball',4);
INSERT INTO equipment_types VALUES(13,'Bicycle',4);
INSERT INTO equipment_types VALUES(14,'Helmet',4);
INSERT INTO equipment_types VALUES(15,'Repair kit',1);


CREATE TABLE reservations (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    facility_id INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    deleted_at TEXT,

    FOREIGN KEY (user_id)
        REFERENCES users(id),

    FOREIGN KEY (facility_id)
        REFERENCES facilities(id)
);

INSERT INTO reservations VALUES(1,2,1,'2026-08-28 20:14:52',NULL);
INSERT INTO reservations VALUES(2,3,4,'2026-08-29 20:14:52',NULL);
INSERT INTO reservations VALUES(3,4,6,'2026-08-30 17:14:52',NULL);
INSERT INTO reservations VALUES(4,4,9,'2026-08-30 18:14:52',NULL);
INSERT INTO reservations VALUES(5,3,14,'2026-08-20 20:14:52','2026-08-21 20:14:52');
INSERT INTO reservations VALUES(6,4,2,'2026-08-22 20:14:52','2026-08-23 20:14:52');
INSERT INTO reservations VALUES(7,4,5,'2026-08-24 20:14:52','2026-08-25 20:14:52');


CREATE TABLE reservation_equipment (
    reservation_id INTEGER NOT NULL,
    equipment_type_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),

    PRIMARY KEY (reservation_id, equipment_type_id),

    FOREIGN KEY (reservation_id)
        REFERENCES reservations(id),

    FOREIGN KEY (equipment_type_id)
        REFERENCES equipment_types(id)
);

INSERT INTO reservation_equipment VALUES(1,1,2);
INSERT INTO reservation_equipment VALUES(1,2,3);
INSERT INTO reservation_equipment VALUES(1,3,1);
INSERT INTO reservation_equipment VALUES(2,4,1);
INSERT INTO reservation_equipment VALUES(3,6,1);
INSERT INTO reservation_equipment VALUES(4,11,2);
INSERT INTO reservation_equipment VALUES(4,12,1);
INSERT INTO reservation_equipment VALUES(5,13,1);
INSERT INTO reservation_equipment VALUES(5,14,1);
INSERT INTO reservation_equipment VALUES(6,1,2);
INSERT INTO reservation_equipment VALUES(6,2,3);
INSERT INTO reservation_equipment VALUES(7,4,1);


CREATE TABLE facility_types (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

INSERT INTO facility_types VALUES(1,'Tennis Court');
INSERT INTO facility_types VALUES(2,'Basketball Court');
INSERT INTO facility_types VALUES(3,'Volleyball Court');
INSERT INTO facility_types VALUES(4,'Soccer Field');
INSERT INTO facility_types VALUES(5,'Table Tennis Table');
INSERT INTO facility_types VALUES(6,'Cycling Track');


CREATE TABLE facilities (
    id INTEGER PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    facility_type_id INTEGER NOT NULL,
    name TEXT NOT NULL,

    FOREIGN KEY (facility_type_id)
        REFERENCES facility_types(id)
);

INSERT INTO facilities VALUES(1,'T1',1,'Tennis Court 1');
INSERT INTO facilities VALUES(2,'T2',1,'Tennis Court 2');
INSERT INTO facilities VALUES(3,'T3',1,'Tennis Court 3');
INSERT INTO facilities VALUES(4,'B1',2,'Basketball Court 1');
INSERT INTO facilities VALUES(5,'B2',2,'Basketball Court 2');
INSERT INTO facilities VALUES(6,'V1',3,'Volleyball Court 1');
INSERT INTO facilities VALUES(7,'V2',3,'Volleyball Court 2');
INSERT INTO facilities VALUES(8,'S1',4,'Soccer Field 1');
INSERT INTO facilities VALUES(9,'P1',5,'Table Tennis Table 1');
INSERT INTO facilities VALUES(10,'P2',5,'Table Tennis Table 2');
INSERT INTO facilities VALUES(11,'P3',5,'Table Tennis Table 3');
INSERT INTO facilities VALUES(12,'P4',5,'Table Tennis Table 4');
INSERT INTO facilities VALUES(13,'C1',6,'Cycling Track 1');
INSERT INTO facilities VALUES(14,'C2',6,'Cycling Track 2');


CREATE TABLE facility_equipment (
   facility_type_id INTEGER NOT NULL,
    equipment_type_id INTEGER NOT NULL,
    minimum_quantity INTEGER NOT NULL DEFAULT 0
        CHECK (minimum_quantity >= 0),

    PRIMARY KEY (
        facility_type_id,
        equipment_type_id
    ),

    FOREIGN KEY (facility_type_id)
        REFERENCES facility_types(id),

    FOREIGN KEY (equipment_type_id)
        REFERENCES equipment_types(id)
);

INSERT INTO facility_equipment VALUES(1,1,2);
INSERT INTO facility_equipment VALUES(1,2,3);
INSERT INTO facility_equipment VALUES(1,3,0);
INSERT INTO facility_equipment VALUES(2,4,1);
INSERT INTO facility_equipment VALUES(2,5,0);
INSERT INTO facility_equipment VALUES(3,6,1);
INSERT INTO facility_equipment VALUES(3,7,0);
INSERT INTO facility_equipment VALUES(4,8,1);
INSERT INTO facility_equipment VALUES(4,9,10);
INSERT INTO facility_equipment VALUES(4,10,0);
INSERT INTO facility_equipment VALUES(5,11,2);
INSERT INTO facility_equipment VALUES(5,12,1);
INSERT INTO facility_equipment VALUES(6,13,1);
INSERT INTO facility_equipment VALUES(6,14,1);
INSERT INTO facility_equipment VALUES(6,15,0);


CREATE TRIGGER trg_reservation_soft_delete_score
AFTER UPDATE OF deleted_at ON reservations
WHEN OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL
BEGIN
  UPDATE users SET score = score - 1 WHERE id = NEW.user_id;
END;
COMMIT;
