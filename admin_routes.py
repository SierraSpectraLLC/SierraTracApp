from datetime import date, datetime, timezone
from functools import wraps
from flask import (
    Blueprint, render_template, request, redirect,
    url_for, flash, session, abort, jsonify
)
from models import db, Instrument, ServiceRecord, Photo, User, generate_sierratrac_id
from storage import upload_photo

admin = Blueprint("admin", __name__, url_prefix="/admin")


# ═══════════════════════════════════════════════════
# AUTH HELPERS
# ═══════════════════════════════════════════════════

def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if "user_id" not in session:
            flash("Please log in to access the admin panel.", "error")
            return redirect(url_for("admin.login"))
        return f(*args, **kwargs)
    return decorated


def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if "user_id" not in session:
            return redirect(url_for("admin.login"))
        user = db.session.get(User, session["user_id"])
        if not user or user.role not in ("admin", "engineer"):
            flash("You don't have permission to access this.", "error")
            return redirect(url_for("admin.dashboard"))
        return f(*args, **kwargs)
    return decorated


def get_current_user():
    if "user_id" in session:
        return db.session.get(User, session["user_id"])
    return None


# ═══════════════════════════════════════════════════
# AUTH ROUTES
# ═══════════════════════════════════════════════════

@admin.route("/login", methods=["GET", "POST"])
def login():
    if "user_id" in session:
        return redirect(url_for("admin.dashboard"))

    if request.method == "POST":
        email = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")

        user = User.query.filter_by(email=email).first()
        if user and user.check_password(password) and user.is_active:
            session["user_id"] = user.id
            session["user_name"] = user.name
            session["user_role"] = user.role
            flash(f"Welcome back, {user.name}.", "success")
            return redirect(url_for("admin.dashboard"))
        else:
            flash("Invalid email or password.", "error")

    return render_template("admin/login.html")


@admin.route("/logout")
def logout():
    session.clear()
    flash("You've been logged out.", "info")
    return redirect(url_for("admin.login"))


# ═══════════════════════════════════════════════════
# DASHBOARD
# ═══════════════════════════════════════════════════

@admin.route("/")
@login_required
def dashboard():
    total_instruments = Instrument.query.count()
    verified_count = Instrument.query.filter_by(verified=True).count()
    pending_count = Instrument.query.filter_by(verified=False).count()
    consignment_count = Instrument.query.filter_by(on_consignment=True).count()
    total_records = ServiceRecord.query.count()
    total_photos = Photo.query.count()

    recent_instruments = (
        Instrument.query
        .order_by(Instrument.created_at.desc())
        .limit(10)
        .all()
    )
    recent_records = (
        ServiceRecord.query
        .order_by(ServiceRecord.created_at.desc())
        .limit(10)
        .all()
    )

    return render_template(
        "admin/dashboard.html",
        total_instruments=total_instruments,
        verified_count=verified_count,
        pending_count=pending_count,
        consignment_count=consignment_count,
        total_records=total_records,
        total_photos=total_photos,
        recent_instruments=recent_instruments,
        recent_records=recent_records,
        user=get_current_user(),
    )


# ═══════════════════════════════════════════════════
# INSTRUMENTS
# ═══════════════════════════════════════════════════

@admin.route("/instruments")
@login_required
def instruments_list():
    page = request.args.get("page", 1, type=int)
    status_filter = request.args.get("status", "")
    search_q = request.args.get("q", "").strip()

    query = Instrument.query

    if status_filter:
        query = query.filter_by(status=status_filter)
    if search_q:
        query = query.filter(
            db.or_(
                Instrument.serial_number.ilike(f"%{search_q}%"),
                Instrument.model_number.ilike(f"%{search_q}%"),
                Instrument.manufacturer.ilike(f"%{search_q}%"),
                Instrument.instrument_type.ilike(f"%{search_q}%"),
            )
        )

    instruments = query.order_by(Instrument.updated_at.desc()).paginate(
        page=page, per_page=20, error_out=False
    )

    return render_template(
        "admin/instruments_list.html",
        instruments=instruments,
        status_filter=status_filter,
        search_q=search_q,
        user=get_current_user(),
    )


@admin.route("/instruments/new", methods=["GET", "POST"])
@login_required
def instrument_create():
    if request.method == "POST":
        serial_number = request.form.get("serial_number", "").strip()
        if not serial_number:
            flash("Serial number is required.", "error")
            return redirect(url_for("admin.instrument_create"))

        existing = Instrument.query.filter(
            db.func.upper(Instrument.serial_number) == serial_number.upper()
        ).first()
        if existing:
            flash("This serial number already exists.", "error")
            return redirect(url_for("admin.instrument_edit", id=existing.id))

        instrument = Instrument(
            sierratrac_id=generate_sierratrac_id(),
            serial_number=serial_number,
            model_number=request.form.get("model_number", "").strip() or None,
            manufacturer=request.form.get("manufacturer", "").strip() or None,
            instrument_type=request.form.get("instrument_type", "").strip() or None,
            category=request.form.get("category", "").strip() or None,
            status=request.form.get("status", "UNKNOWN"),
            qr_tagged="qr_tagged" in request.form,
            verified="verified" in request.form,
            on_consignment="on_consignment" in request.form,
            consignment_location=request.form.get("consignment_location", "").strip() or None,
            seller_name=request.form.get("seller_name", "").strip() or None,
            asking_price=request.form.get("asking_price", type=float),
            registered_by=session.get("user_id"),
        )

        # Parse specs from form (key-value pairs)
        spec_keys = request.form.getlist("spec_key")
        spec_vals = request.form.getlist("spec_val")
        specs = {}
        for k, v in zip(spec_keys, spec_vals):
            if k.strip() and v.strip():
                specs[k.strip()] = v.strip()
        instrument.specs = specs

        db.session.add(instrument)
        db.session.commit()

        flash(f"Instrument {serial_number} created ({instrument.sierratrac_id}).", "success")
        return redirect(url_for("admin.instrument_edit", id=instrument.id))

    return render_template("admin/instrument_form.html", instrument=None, user=get_current_user())


@admin.route("/instruments/<int:id>", methods=["GET", "POST"])
@login_required
def instrument_edit(id):
    instrument = db.session.get(Instrument, id) or abort(404)

    if request.method == "POST":
        instrument.serial_number = request.form.get("serial_number", instrument.serial_number).strip()
        instrument.model_number = request.form.get("model_number", "").strip() or None
        instrument.manufacturer = request.form.get("manufacturer", "").strip() or None
        instrument.instrument_type = request.form.get("instrument_type", "").strip() or None
        instrument.category = request.form.get("category", "").strip() or None
        instrument.status = request.form.get("status", instrument.status)
        instrument.qr_tagged = "qr_tagged" in request.form
        instrument.verified = "verified" in request.form
        instrument.on_consignment = "on_consignment" in request.form
        instrument.consignment_location = request.form.get("consignment_location", "").strip() or None
        instrument.seller_name = request.form.get("seller_name", "").strip() or None

        price = request.form.get("asking_price", "").strip()
        instrument.asking_price = float(price) if price else None

        # Parse specs
        spec_keys = request.form.getlist("spec_key")
        spec_vals = request.form.getlist("spec_val")
        specs = {}
        for k, v in zip(spec_keys, spec_vals):
            if k.strip() and v.strip():
                specs[k.strip()] = v.strip()
        instrument.specs = specs

        instrument.updated_at = datetime.now(timezone.utc)
        db.session.commit()
        flash("Instrument updated.", "success")
        return redirect(url_for("admin.instrument_edit", id=id))

    records = instrument.service_records.all()
    photos = instrument.photos.all()

    return render_template(
        "admin/instrument_form.html",
        instrument=instrument,
        records=records,
        photos=photos,
        user=get_current_user(),
    )


@admin.route("/instruments/<int:id>/delete", methods=["POST"])
@admin_required
def instrument_delete(id):
    instrument = db.session.get(Instrument, id) or abort(404)
    sn = instrument.serial_number

    # Delete associated records and photos
    ServiceRecord.query.filter_by(instrument_id=id).delete()
    Photo.query.filter_by(instrument_id=id).delete()
    db.session.delete(instrument)
    db.session.commit()

    flash(f"Instrument {sn} deleted.", "info")
    return redirect(url_for("admin.instruments_list"))


# ═══════════════════════════════════════════════════
# SERVICE RECORDS
# ═══════════════════════════════════════════════════

@admin.route("/instruments/<int:instrument_id>/records/new", methods=["GET", "POST"])
@login_required
def record_create(instrument_id):
    instrument = db.session.get(Instrument, instrument_id) or abort(404)

    if request.method == "POST":
        record = ServiceRecord(
            instrument_id=instrument.id,
            record_type=request.form.get("record_type", "service"),
            title=request.form.get("title", "").strip(),
            summary=request.form.get("summary", "").strip() or None,
            service_date=date.fromisoformat(request.form.get("service_date", date.today().isoformat())),
            engineer_name=request.form.get("engineer_name", "").strip() or None,
            organization=request.form.get("organization", "").strip() or None,
            designation=request.form.get("designation", "").strip() or None,
            notes=request.form.get("notes", "").strip() or None,
            created_by=session.get("user_id"),
        )

        # Parse findings
        findings_raw = request.form.get("findings_text", "").strip()
        if findings_raw:
            record.findings = [f.strip() for f in findings_raw.split("\n") if f.strip()]

        db.session.add(record)

        # Update instrument status if designation provided
        if record.designation:
            instrument.status = record.designation
            instrument.verified = True
            instrument.updated_at = datetime.now(timezone.utc)

        db.session.commit()

        # Handle photo uploads
        photos = request.files.getlist("photos")
        captions = request.form.getlist("photo_caption")
        for i, file in enumerate(photos):
            if file and file.filename:
                try:
                    storage_url, filename, file_size, content_type = upload_photo(
                        file, instrument.serial_number
                    )
                    photo = Photo(
                        instrument_id=instrument.id,
                        service_record_id=record.id,
                        filename=filename,
                        storage_url=storage_url,
                        caption=captions[i] if i < len(captions) else "",
                        file_size=file_size,
                        content_type=content_type,
                        uploaded_by=session.get("user_id"),
                    )
                    db.session.add(photo)
                except ValueError as e:
                    flash(f"Photo upload failed: {e}", "error")
        db.session.commit()

        flash(f"Service record added: {record.title}", "success")
        return redirect(url_for("admin.instrument_edit", id=instrument.id))

    return render_template(
        "admin/record_form.html",
        instrument=instrument,
        record=None,
        user=get_current_user(),
    )


@admin.route("/records/<int:id>/edit", methods=["GET", "POST"])
@login_required
def record_edit(id):
    record = db.session.get(ServiceRecord, id) or abort(404)
    instrument = record.instrument

    if request.method == "POST":
        record.record_type = request.form.get("record_type", record.record_type)
        record.title = request.form.get("title", record.title).strip()
        record.summary = request.form.get("summary", "").strip() or None
        record.service_date = date.fromisoformat(request.form.get("service_date", record.service_date.isoformat()))
        record.engineer_name = request.form.get("engineer_name", "").strip() or None
        record.organization = request.form.get("organization", "").strip() or None
        record.designation = request.form.get("designation", "").strip() or None
        record.notes = request.form.get("notes", "").strip() or None

        findings_raw = request.form.get("findings_text", "").strip()
        if findings_raw:
            record.findings = [f.strip() for f in findings_raw.split("\n") if f.strip()]
        else:
            record.findings = []

        if record.designation:
            instrument.status = record.designation
            instrument.verified = True

        db.session.commit()
        flash("Service record updated.", "success")
        return redirect(url_for("admin.instrument_edit", id=instrument.id))

    return render_template(
        "admin/record_form.html",
        instrument=instrument,
        record=record,
        user=get_current_user(),
    )


@admin.route("/records/<int:id>/delete", methods=["POST"])
@login_required
def record_delete(id):
    record = db.session.get(ServiceRecord, id) or abort(404)
    instrument_id = record.instrument_id
    db.session.delete(record)
    db.session.commit()
    flash("Service record deleted.", "info")
    return redirect(url_for("admin.instrument_edit", id=instrument_id))


# ═══════════════════════════════════════════════════
# PHOTOS
# ═══════════════════════════════════════════════════

@admin.route("/instruments/<int:instrument_id>/photos/upload", methods=["POST"])
@login_required
def photo_upload(instrument_id):
    instrument = db.session.get(Instrument, instrument_id) or abort(404)

    files = request.files.getlist("photos")
    captions = request.form.getlist("photo_caption")
    count = 0

    for i, file in enumerate(files):
        if file and file.filename:
            try:
                storage_url, filename, file_size, content_type = upload_photo(
                    file, instrument.serial_number
                )
                photo = Photo(
                    instrument_id=instrument.id,
                    filename=filename,
                    storage_url=storage_url,
                    caption=captions[i] if i < len(captions) else "",
                    file_size=file_size,
                    content_type=content_type,
                    uploaded_by=session.get("user_id"),
                )
                db.session.add(photo)
                count += 1
            except ValueError as e:
                flash(f"Upload failed for {file.filename}: {e}", "error")

    db.session.commit()
    if count:
        flash(f"{count} photo{'s' if count > 1 else ''} uploaded.", "success")
    return redirect(url_for("admin.instrument_edit", id=instrument_id))


@admin.route("/photos/<int:id>/delete", methods=["POST"])
@login_required
def photo_delete(id):
    photo = db.session.get(Photo, id) or abort(404)
    instrument_id = photo.instrument_id
    db.session.delete(photo)
    db.session.commit()
    flash("Photo deleted.", "info")
    return redirect(url_for("admin.instrument_edit", id=instrument_id))


# ═══════════════════════════════════════════════════
# USER MANAGEMENT (admin only)
# ═══════════════════════════════════════════════════

@admin.route("/users")
@admin_required
def users_list():
    users = User.query.order_by(User.created_at.desc()).all()
    return render_template("admin/users_list.html", users=users, user=get_current_user())


@admin.route("/users/new", methods=["GET", "POST"])
@admin_required
def user_create():
    if request.method == "POST":
        email = request.form.get("email", "").strip().lower()
        name = request.form.get("name", "").strip()
        password = request.form.get("password", "")
        role = request.form.get("role", "viewer")

        if User.query.filter_by(email=email).first():
            flash("A user with this email already exists.", "error")
            return redirect(url_for("admin.user_create"))

        user = User(email=email, name=name, role=role, organization=request.form.get("organization", "").strip() or None)
        user.set_password(password)
        db.session.add(user)
        db.session.commit()

        flash(f"User {name} created.", "success")
        return redirect(url_for("admin.users_list"))

    return render_template("admin/user_form.html", edit_user=None, user=get_current_user())


@admin.route("/users/<int:id>/edit", methods=["GET", "POST"])
@admin_required
def user_edit(id):
    edit_user = db.session.get(User, id) or abort(404)

    if request.method == "POST":
        edit_user.name = request.form.get("name", edit_user.name).strip()
        edit_user.email = request.form.get("email", edit_user.email).strip().lower()
        edit_user.role = request.form.get("role", edit_user.role)
        edit_user.organization = request.form.get("organization", "").strip() or None
        edit_user.is_active = "is_active" in request.form

        new_password = request.form.get("password", "").strip()
        if new_password:
            edit_user.set_password(new_password)

        db.session.commit()
        flash(f"User {edit_user.name} updated.", "success")
        return redirect(url_for("admin.users_list"))

    return render_template("admin/user_form.html", edit_user=edit_user, user=get_current_user())
