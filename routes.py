from datetime import date, datetime, timezone
from flask import (
    Blueprint, render_template, request, redirect,
    url_for, flash, jsonify, abort
)
from models import (
    db, Instrument, ServiceRecord, Photo, System, SystemSwap,
    ServiceRequest, generate_sierratrac_id, generate_sr_id
)
from storage import upload_photo, allowed_file

main = Blueprint("main", __name__)
api = Blueprint("api", __name__, url_prefix="/api")


# ═══════════════════════════════════════════════════
# WEB ROUTES (server-rendered templates)
# ═══════════════════════════════════════════════════

@main.route("/")
def index():
    """Landing page — the search bar."""
    total_instruments = Instrument.query.count()
    return render_template("index.html", total_instruments=total_instruments)


@main.route("/search")
def search():
    """Search by serial number or model number."""
    query = request.args.get("q", "").strip()
    if not query:
        return redirect(url_for("main.index"))

    # Try exact serial number match first
    instrument = Instrument.query.filter(
        db.func.upper(Instrument.serial_number) == query.upper()
    ).first()

    # Then try model number
    if not instrument:
        instrument = Instrument.query.filter(
            db.func.upper(Instrument.model_number) == query.upper()
        ).first()

    if instrument:
        return redirect(url_for("main.instrument_detail", sierratrac_id=instrument.sierratrac_id))
    else:
        return render_template("not_found.html", query=query)


@main.route("/instrument/<sierratrac_id>")
def instrument_detail(sierratrac_id):
    """Full instrument report page."""
    instrument = Instrument.query.filter_by(sierratrac_id=sierratrac_id).first_or_404()
    service_records = instrument.service_records.all()
    photos = instrument.photos.all()
    return render_template(
        "instrument.html",
        instrument=instrument,
        service_records=service_records,
        photos=photos,
    )


@main.route("/register", methods=["GET", "POST"])
def register_instrument():
    """Self-registration form for new instruments."""
    if request.method == "GET":
        prefill_sn = request.args.get("sn", "")
        return render_template("register.html", prefill_sn=prefill_sn)

    # POST — process registration
    serial_number = request.form.get("serial_number", "").strip()
    if not serial_number:
        flash("Serial number is required.", "error")
        return redirect(url_for("main.register_instrument"))

    # Check if already exists
    existing = Instrument.query.filter(
        db.func.upper(Instrument.serial_number) == serial_number.upper()
    ).first()
    if existing:
        flash("This serial number is already registered.", "info")
        return redirect(url_for("main.instrument_detail", sierratrac_id=existing.sierratrac_id))

    # Create new instrument
    instrument = Instrument(
        sierratrac_id=generate_sierratrac_id(),
        serial_number=serial_number,
        model_number=request.form.get("model_number", "").strip() or None,
        manufacturer=request.form.get("manufacturer", "").strip() or None,
        category=request.form.get("category", "").strip() or None,
        status=request.form.get("condition", "UNKNOWN").upper(),
        verified=False,
    )
    db.session.add(instrument)

    # If user provided notes, create an initial service record
    notes = request.form.get("notes", "").strip()
    if notes:
        record = ServiceRecord(
            instrument=instrument,
            record_type="listing",
            title="Self-Registration",
            summary=notes,
            service_date=date.today(),
            organization="Self-registered",
        )
        db.session.add(record)

    db.session.commit()

    return render_template(
        "register_success.html",
        instrument=instrument,
    )


@main.route("/instrument/<sierratrac_id>/upload", methods=["POST"])
def upload_instrument_photo(sierratrac_id):
    """Upload photo for an instrument."""
    instrument = Instrument.query.filter_by(sierratrac_id=sierratrac_id).first_or_404()

    if "photo" not in request.files:
        flash("No file selected.", "error")
        return redirect(url_for("main.instrument_detail", sierratrac_id=sierratrac_id))

    file = request.files["photo"]
    if file.filename == "":
        flash("No file selected.", "error")
        return redirect(url_for("main.instrument_detail", sierratrac_id=sierratrac_id))

    try:
        storage_url, filename, file_size, content_type = upload_photo(
            file, instrument.serial_number
        )
    except ValueError as e:
        flash(str(e), "error")
        return redirect(url_for("main.instrument_detail", sierratrac_id=sierratrac_id))

    photo = Photo(
        instrument=instrument,
        filename=filename,
        storage_url=storage_url,
        caption=request.form.get("caption", ""),
        file_size=file_size,
        content_type=content_type,
    )
    db.session.add(photo)
    db.session.commit()

    flash("Photo uploaded successfully.", "success")
    return redirect(url_for("main.instrument_detail", sierratrac_id=sierratrac_id))


# ═══════════════════════════════════════════════════
# API ROUTES (JSON — for future mobile app or SPA)
# ═══════════════════════════════════════════════════

@api.route("/search")
def api_search():
    """Search instruments via API."""
    query = request.args.get("q", "").strip()
    if not query:
        return jsonify({"error": "Query parameter 'q' is required"}), 400

    instrument = Instrument.query.filter(
        db.or_(
            db.func.upper(Instrument.serial_number) == query.upper(),
            db.func.upper(Instrument.model_number) == query.upper(),
        )
    ).first()

    if instrument:
        return jsonify({"found": True, "instrument": instrument.to_dict()})
    else:
        return jsonify({"found": False, "query": query})


@api.route("/instruments", methods=["POST"])
def api_register():
    """Register instrument via API."""
    data = request.get_json()
    if not data or not data.get("serial_number"):
        return jsonify({"error": "serial_number is required"}), 400

    serial_number = data["serial_number"].strip()

    existing = Instrument.query.filter(
        db.func.upper(Instrument.serial_number) == serial_number.upper()
    ).first()
    if existing:
        return jsonify({"error": "Already registered", "sierratrac_id": existing.sierratrac_id}), 409

    instrument = Instrument(
        sierratrac_id=generate_sierratrac_id(),
        serial_number=serial_number,
        model_number=data.get("model_number"),
        manufacturer=data.get("manufacturer"),
        category=data.get("category"),
        status=data.get("condition", "UNKNOWN").upper(),
        verified=False,
    )
    db.session.add(instrument)
    db.session.commit()

    return jsonify({"instrument": instrument.to_dict()}), 201


@api.route("/instruments/<sierratrac_id>")
def api_instrument(sierratrac_id):
    """Get instrument by SierraTrac ID."""
    instrument = Instrument.query.filter_by(sierratrac_id=sierratrac_id).first()
    if not instrument:
        return jsonify({"error": "Not found"}), 404
    return jsonify({"instrument": instrument.to_dict()})


@api.route("/instruments/<sierratrac_id>/records", methods=["POST"])
def api_add_record(sierratrac_id):
    """Add service record to instrument (requires authentication in production)."""
    instrument = Instrument.query.filter_by(sierratrac_id=sierratrac_id).first()
    if not instrument:
        return jsonify({"error": "Not found"}), 404

    data = request.get_json()
    if not data:
        return jsonify({"error": "JSON body required"}), 400

    record = ServiceRecord(
        instrument=instrument,
        record_type=data.get("record_type", "service"),
        title=data.get("title", "Service Record"),
        summary=data.get("summary"),
        service_date=date.fromisoformat(data.get("service_date", date.today().isoformat())),
        engineer_name=data.get("engineer_name"),
        organization=data.get("organization"),
        findings=data.get("findings", []),
        designation=data.get("designation"),
        notes=data.get("notes"),
    )
    db.session.add(record)

    # Update instrument status if designation provided
    if data.get("designation"):
        instrument.status = data["designation"]
        instrument.verified = True

    db.session.commit()

    return jsonify({"record": record.to_dict()}), 201


# ═══════════════════════════════════════════════════
# SERVICE REQUEST ROUTES
# ═══════════════════════════════════════════════════

@main.route("/instrument/<sierratrac_id>/request-service", methods=["GET", "POST"])
def request_service(sierratrac_id):
    """Lab tech service request form (accessed via QR scan)."""
    instrument = Instrument.query.filter_by(sierratrac_id=sierratrac_id).first_or_404()

    if request.method == "POST":
        sr = ServiceRequest(
            request_id=generate_sr_id(),
            instrument_id=instrument.id,
            system_id_fk=instrument.system_id,
            urgency=request.form.get("urgency", ""),
            description=request.form.get("description", ""),
            error_codes=request.form.getlist("error_codes"),
            custom_error=request.form.get("custom_error", "").strip() or None,
            impact=request.form.get("impact", ""),
            submitted_by="Lab Tech (QR scan)",
        )
        db.session.add(sr)

        # Flag instrument as WARNING
        instrument.status = "WARNING"

        # Flag system if associated
        if instrument.system:
            instrument.system.status = "WARNING"

        db.session.commit()

        # Handle photo uploads
        photos = request.files.getlist("photos")
        for file in photos:
            if file and file.filename:
                try:
                    storage_url, filename, file_size, content_type = upload_photo(
                        file, instrument.serial_number
                    )
                    photo = Photo(
                        instrument_id=instrument.id,
                        filename=filename,
                        storage_url=storage_url,
                        caption=f"Service Request {sr.request_id}",
                        file_size=file_size,
                        content_type=content_type,
                    )
                    db.session.add(photo)
                except ValueError:
                    pass
        db.session.commit()

        return render_template("service_request_submitted.html",
                               instrument=instrument, sr=sr)

    return render_template("service_request.html", instrument=instrument)


@api.route("/service-requests", methods=["POST"])
def api_create_service_request():
    """Submit service request via API."""
    data = request.get_json()
    if not data or not data.get("instrument_sn"):
        return jsonify({"error": "instrument_sn required"}), 400

    instrument = Instrument.query.filter(
        db.func.upper(Instrument.serial_number) == data["instrument_sn"].upper()
    ).first()
    if not instrument:
        return jsonify({"error": "Instrument not found"}), 404

    sr = ServiceRequest(
        request_id=generate_sr_id(),
        instrument_id=instrument.id,
        system_id_fk=instrument.system_id,
        urgency=data.get("urgency", "Medium"),
        description=data.get("description", ""),
        error_codes=data.get("error_codes", []),
        custom_error=data.get("custom_error"),
        impact=data.get("impact"),
        submitted_by=data.get("submitted_by", "API"),
    )
    db.session.add(sr)
    instrument.status = "WARNING"
    if instrument.system:
        instrument.system.status = "WARNING"
    db.session.commit()

    return jsonify({"service_request": sr.to_dict()}), 201


@api.route("/service-requests/<request_id>/resolve", methods=["POST"])
def api_resolve_service_request(request_id):
    """ISO engineer confirms or dismisses a service request. GLP explanation required."""
    sr = ServiceRequest.query.filter_by(request_id=request_id).first()
    if not sr:
        return jsonify({"error": "Not found"}), 404
    if sr.status != "pending":
        return jsonify({"error": "Already resolved"}), 400

    data = request.get_json()
    if not data:
        return jsonify({"error": "JSON body required"}), 400

    action = data.get("action")  # "confirmed" or "dismissed"
    explanation = data.get("glp_explanation", "").strip()

    if action not in ("confirmed", "dismissed"):
        return jsonify({"error": "action must be 'confirmed' or 'dismissed'"}), 400
    if not explanation:
        return jsonify({"error": "glp_explanation is required for GLP compliance"}), 400

    sr.status = action
    sr.resolution_action = action
    sr.glp_explanation = explanation
    sr.resolved_at = datetime.now(timezone.utc)

    instrument = sr.instrument

    if action == "confirmed":
        # Create service record
        record = ServiceRecord(
            instrument_id=instrument.id,
            record_type="service",
            title=f"Service Request {sr.request_id} — Confirmed",
            summary=sr.description,
            service_date=date.today(),
            engineer_name=data.get("engineer_name"),
            organization=data.get("organization", "Sierra Spectra"),
            findings=sr.error_codes or [],
            designation="NON-WORKING",
            notes=explanation,
        )
        db.session.add(record)
        sr.service_record_id = record.id
        instrument.status = "NON-WORKING"
    else:
        # Dismissed — clear warning
        instrument.status = "WORKING"

    # Clear system warning if no other pending requests
    if instrument.system:
        other_pending = ServiceRequest.query.filter(
            ServiceRequest.system_id_fk == instrument.system_id,
            ServiceRequest.status == "pending",
            ServiceRequest.id != sr.id,
        ).count()
        if other_pending == 0:
            instrument.system.status = "WORKING" if action == "dismissed" else "WARNING"

    db.session.commit()
    return jsonify({"service_request": sr.to_dict()}), 200


@api.route("/service-requests")
def api_list_service_requests():
    """List service requests with optional status filter."""
    status_filter = request.args.get("status")
    query = ServiceRequest.query.order_by(ServiceRequest.created_at.desc())
    if status_filter:
        query = query.filter_by(status=status_filter)
    return jsonify({"requests": [sr.to_dict() for sr in query.limit(50).all()]})
