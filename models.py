from datetime import datetime, timezone
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()


# ─────────────────────────────────────────────
# INSTRUMENTS
# ─────────────────────────────────────────────

class Instrument(db.Model):
    """Core instrument record — one row per unique serial number."""
    __tablename__ = "instruments"

    id = db.Column(db.Integer, primary_key=True)
    sierratrac_id = db.Column(db.String(20), unique=True, nullable=False, index=True)
    serial_number = db.Column(db.String(100), unique=True, nullable=False, index=True)
    model_number = db.Column(db.String(100), index=True)
    manufacturer = db.Column(db.String(200))
    instrument_type = db.Column(db.String(300))
    category = db.Column(db.String(50))  # UPLC, GC, Mass Spec, NMR, etc.

    # Current status
    status = db.Column(db.String(20), default="UNKNOWN")  # WORKING, NON-WORKING, REFURBISHED, UNKNOWN
    qr_tagged = db.Column(db.Boolean, default=False)
    verified = db.Column(db.Boolean, default=False)  # Has been inspected by authorized org

    # System association
    system_id = db.Column(db.Integer, db.ForeignKey("systems.id"), nullable=True)
    slot_position = db.Column(db.String(50))  # Pump, Autosampler, Thermostat, Detector, etc.

    # Consignment fields
    on_consignment = db.Column(db.Boolean, default=False)
    consignment_location = db.Column(db.String(300))
    seller_name = db.Column(db.String(200))
    asking_price = db.Column(db.Numeric(10, 2))

    # Specs stored as JSON
    specs = db.Column(db.JSON, default=dict)

    # Metadata
    registered_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    service_records = db.relationship(
        "ServiceRecord", backref="instrument", lazy="dynamic",
        order_by="ServiceRecord.service_date.desc()"
    )
    photos = db.relationship("Photo", backref="instrument", lazy="dynamic")

    def __repr__(self):
        return f"<Instrument {self.serial_number} ({self.model_number})>"

    def to_dict(self):
        return {
            "id": self.id,
            "sierratrac_id": self.sierratrac_id,
            "serial_number": self.serial_number,
            "model_number": self.model_number,
            "manufacturer": self.manufacturer,
            "instrument_type": self.instrument_type,
            "category": self.category,
            "status": self.status,
            "qr_tagged": self.qr_tagged,
            "verified": self.verified,
            "on_consignment": self.on_consignment,
            "consignment_location": self.consignment_location,
            "seller_name": self.seller_name,
            "asking_price": str(self.asking_price) if self.asking_price else None,
            "specs": self.specs,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "service_records": [r.to_dict() for r in self.service_records],
            "photos": [p.to_dict() for p in self.photos],
        }


# ─────────────────────────────────────────────
# SERVICE RECORDS
# ─────────────────────────────────────────────

class ServiceRecord(db.Model):
    """
    A single service event in an instrument's history.
    Types: inspection, service, qualification, listing, purchase
    """
    __tablename__ = "service_records"

    id = db.Column(db.Integer, primary_key=True)
    instrument_id = db.Column(db.Integer, db.ForeignKey("instruments.id"), nullable=False, index=True)

    record_type = db.Column(db.String(30), nullable=False)  # inspection, service, qualification, listing, purchase
    title = db.Column(db.String(300), nullable=False)
    summary = db.Column(db.Text)
    service_date = db.Column(db.Date, nullable=False)

    # Engineer / organization
    engineer_name = db.Column(db.String(200))
    organization = db.Column(db.String(200))

    # Findings stored as JSON array of strings
    findings = db.Column(db.JSON, default=list)

    # Designation at time of this record
    designation = db.Column(db.String(20))  # WORKING, NON-WORKING, or null

    # Engineer notes
    notes = db.Column(db.Text)

    # Metadata
    created_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    # Photos linked to this specific service record
    photos = db.relationship("Photo", backref="service_record", lazy="dynamic")

    def __repr__(self):
        return f"<ServiceRecord {self.record_type}: {self.title}>"

    def to_dict(self):
        return {
            "id": self.id,
            "record_type": self.record_type,
            "title": self.title,
            "summary": self.summary,
            "service_date": self.service_date.isoformat() if self.service_date else None,
            "engineer_name": self.engineer_name,
            "organization": self.organization,
            "findings": self.findings or [],
            "designation": self.designation,
            "notes": self.notes,
            "photos": [p.to_dict() for p in self.photos],
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


# ─────────────────────────────────────────────
# PHOTOS
# ─────────────────────────────────────────────

class Photo(db.Model):
    """Photo stored in Azure Blob Storage (or local during dev)."""
    __tablename__ = "photos"

    id = db.Column(db.Integer, primary_key=True)
    instrument_id = db.Column(db.Integer, db.ForeignKey("instruments.id"), nullable=False, index=True)
    service_record_id = db.Column(db.Integer, db.ForeignKey("service_records.id"), nullable=True)

    filename = db.Column(db.String(300), nullable=False)
    storage_url = db.Column(db.String(500), nullable=False)  # Azure Blob URL or local path
    caption = db.Column(db.String(500))
    file_size = db.Column(db.Integer)  # bytes
    content_type = db.Column(db.String(50))

    uploaded_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def __repr__(self):
        return f"<Photo {self.filename}>"

    def to_dict(self):
        return {
            "id": self.id,
            "filename": self.filename,
            "storage_url": self.storage_url,
            "caption": self.caption,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


# ─────────────────────────────────────────────
# USERS
# ─────────────────────────────────────────────

class User(db.Model):
    """
    Users: Sierra engineers, ISO technicians, sellers, buyers.
    Role determines what they can do.
    """
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(200), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    name = db.Column(db.String(200), nullable=False)
    organization = db.Column(db.String(200))

    # Roles: admin, engineer, seller, buyer, viewer
    role = db.Column(db.String(20), default="viewer")

    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def __repr__(self):
        return f"<User {self.email}>"


# ─────────────────────────────────────────────
# ID GENERATION
# ─────────────────────────────────────────────

def generate_sierratrac_id():
    """Generate next SierraTrac ID like ST-2026-00848."""
    year = datetime.now(timezone.utc).year
    last = (
        Instrument.query
        .filter(Instrument.sierratrac_id.like(f"ST-{year}-%"))
        .order_by(Instrument.id.desc())
        .first()
    )
    if last:
        seq = int(last.sierratrac_id.split("-")[-1]) + 1
    else:
        seq = 1
    return f"ST-{year}-{seq:05d}"


def generate_system_id():
    """Generate next System ID like SYS-2026-0013."""
    year = datetime.now(timezone.utc).year
    last = (
        System.query
        .filter(System.system_id.like(f"SYS-{year}-%"))
        .order_by(System.id.desc())
        .first()
    )
    if last:
        seq = int(last.system_id.split("-")[-1]) + 1
    else:
        seq = 1
    return f"SYS-{year}-{seq:04d}"


def generate_sr_id():
    """Generate next Service Request ID like SR-2026-00219."""
    year = datetime.now(timezone.utc).year
    last = (
        ServiceRequest.query
        .filter(ServiceRequest.request_id.like(f"SR-{year}-%"))
        .order_by(ServiceRequest.id.desc())
        .first()
    )
    if last:
        seq = int(last.request_id.split("-")[-1]) + 1
    else:
        seq = 1
    return f"SR-{year}-{seq:05d}"


# ─────────────────────────────────────────────
# SYSTEMS (instrument stacks)
# ─────────────────────────────────────────────

class System(db.Model):
    """A system / stack of coupled instruments (e.g. a UPLC stack)."""
    __tablename__ = "systems"

    id = db.Column(db.Integer, primary_key=True)
    system_id = db.Column(db.String(20), unique=True, nullable=False, index=True)
    name = db.Column(db.String(200), nullable=False)
    location = db.Column(db.String(300))
    client = db.Column(db.String(200))
    status = db.Column(db.String(20), default="WORKING")
    qualified = db.Column(db.Boolean, default=False)
    last_qualified = db.Column(db.Date)

    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc),
                           onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    instruments = db.relationship("Instrument", backref="system", lazy="dynamic")
    swaps = db.relationship("SystemSwap", backref="system", lazy="dynamic",
                            order_by="SystemSwap.swap_date.desc()")
    service_requests = db.relationship("ServiceRequest", backref="system", lazy="dynamic")

    def __repr__(self):
        return f"<System {self.system_id}: {self.name}>"

    def to_dict(self):
        return {
            "id": self.id,
            "system_id": self.system_id,
            "name": self.name,
            "location": self.location,
            "client": self.client,
            "status": self.status,
            "qualified": self.qualified,
            "last_qualified": self.last_qualified.isoformat() if self.last_qualified else None,
            "instruments": [
                {"id": i.id, "serial_number": i.serial_number, "model_number": i.model_number,
                 "slot_position": i.slot_position, "status": i.status}
                for i in self.instruments
            ],
        }


class SystemSwap(db.Model):
    """Log of module coupling/decoupling events within a system."""
    __tablename__ = "system_swaps"

    id = db.Column(db.Integer, primary_key=True)
    system_id_fk = db.Column(db.Integer, db.ForeignKey("systems.id"), nullable=False, index=True)
    swap_date = db.Column(db.Date, nullable=False)
    slot_position = db.Column(db.String(50), nullable=False)

    # Module removed (nullable for initial coupling)
    removed_instrument_id = db.Column(db.Integer, db.ForeignKey("instruments.id"), nullable=True)
    removed_reason = db.Column(db.Text)

    # Module installed (nullable for decoupling)
    installed_instrument_id = db.Column(db.Integer, db.ForeignKey("instruments.id"), nullable=True)

    engineer_name = db.Column(db.String(200))
    organization = db.Column(db.String(200))
    notes = db.Column(db.Text)
    requalified = db.Column(db.Boolean, default=False)

    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    removed_instrument = db.relationship("Instrument", foreign_keys=[removed_instrument_id])
    installed_instrument = db.relationship("Instrument", foreign_keys=[installed_instrument_id])

    def to_dict(self):
        return {
            "id": self.id,
            "swap_date": self.swap_date.isoformat() if self.swap_date else None,
            "slot_position": self.slot_position,
            "removed_sn": self.removed_instrument.serial_number if self.removed_instrument else None,
            "removed_model": self.removed_instrument.model_number if self.removed_instrument else None,
            "removed_reason": self.removed_reason,
            "installed_sn": self.installed_instrument.serial_number if self.installed_instrument else None,
            "installed_model": self.installed_instrument.model_number if self.installed_instrument else None,
            "engineer_name": self.engineer_name,
            "notes": self.notes,
            "requalified": self.requalified,
        }


# ─────────────────────────────────────────────
# SERVICE REQUESTS (lab tech → ISO workflow)
# ─────────────────────────────────────────────

class ServiceRequest(db.Model):
    """
    Service request submitted by lab tech (via QR scan).
    Must be confirmed or dismissed by ISO engineer with GLP explanation.
    """
    __tablename__ = "service_requests"

    id = db.Column(db.Integer, primary_key=True)
    request_id = db.Column(db.String(20), unique=True, nullable=False, index=True)

    # Instrument and system
    instrument_id = db.Column(db.Integer, db.ForeignKey("instruments.id"), nullable=False, index=True)
    system_id_fk = db.Column(db.Integer, db.ForeignKey("systems.id"), nullable=True)

    # Request details (from lab tech)
    urgency = db.Column(db.String(50), nullable=False)  # Critical, High, Medium, Low
    description = db.Column(db.Text, nullable=False)
    error_codes = db.Column(db.JSON, default=list)  # Array of error code strings
    custom_error = db.Column(db.String(300))
    impact = db.Column(db.String(200))
    submitted_by = db.Column(db.String(200))  # "Lab Tech (QR scan)" or user name

    # Status: pending, confirmed, dismissed
    status = db.Column(db.String(20), default="pending", index=True)

    # ISO resolution (required for confirm/dismiss)
    resolved_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    resolved_at = db.Column(db.DateTime)
    resolution_action = db.Column(db.String(20))  # "confirmed" or "dismissed"
    glp_explanation = db.Column(db.Text)  # Required — engineer's GLP documentation
    service_record_id = db.Column(db.Integer, db.ForeignKey("service_records.id"), nullable=True)

    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    instrument = db.relationship("Instrument", backref="service_requests")
    resolver = db.relationship("User", foreign_keys=[resolved_by])
    linked_record = db.relationship("ServiceRecord", foreign_keys=[service_record_id])

    def __repr__(self):
        return f"<ServiceRequest {self.request_id} ({self.status})>"

    def to_dict(self):
        return {
            "id": self.id,
            "request_id": self.request_id,
            "instrument_sn": self.instrument.serial_number if self.instrument else None,
            "instrument_model": self.instrument.model_number if self.instrument else None,
            "system_name": self.system.name if self.system else None,
            "urgency": self.urgency,
            "description": self.description,
            "error_codes": self.error_codes,
            "custom_error": self.custom_error,
            "impact": self.impact,
            "status": self.status,
            "resolution_action": self.resolution_action,
            "glp_explanation": self.glp_explanation,
            "resolved_at": self.resolved_at.isoformat() if self.resolved_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
