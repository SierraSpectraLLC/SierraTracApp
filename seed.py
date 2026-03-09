"""
Seed the database with demo instruments matching the SierraTrac prototype.
Run: python seed.py
"""
from datetime import date
from app import create_app
from models import db, Instrument, ServiceRecord, User


def seed():
    app = create_app("development")
    with app.app_context():
        # Clear existing data
        ServiceRecord.query.delete()
        Instrument.query.delete()
        db.session.commit()

        # ─── Instrument 1: Non-working G1330B (consignment) ───
        g1330b = Instrument(
            sierratrac_id="ST-2026-00847",
            serial_number="JP45821039",
            model_number="G1330B",
            manufacturer="Agilent Technologies",
            instrument_type="1290 Infinity II Multicolumn Thermostat",
            category="UPLC",
            status="NON-WORKING",
            qr_tagged=True,
            verified=True,
            on_consignment=True,
            consignment_location="Sierra Spectra Lab — Oakhurst, CA",
            seller_name="BioSurplus Inc.",
            asking_price=12400.00,
            specs={
                "Temperature Range": "4°C to 105°C (Peltier)",
                "Column Capacity": "Up to 6 columns (max 300mm)",
                "Valve Options": "2-pos/6-port, 2-pos/10-port",
                "Communication": "CAN bus (Agilent ICF)",
                "Power Requirements": "100–240V, 50/60Hz",
                "Dimensions": "345 × 220 × 435 mm",
                "Weight": "12.5 kg",
            },
        )
        db.session.add(g1330b)
        db.session.flush()

        # Service records for G1330B
        records_1 = [
            ServiceRecord(
                instrument_id=g1330b.id,
                record_type="inspection",
                title="Intake Inspection — Consignment",
                summary="Unit received from BioSurplus for consignment intake. External condition fair — minor cosmetic wear on housing, all connectors intact. Powered on successfully. Internal diagnostics initiated.",
                service_date=date(2026, 3, 1),
                engineer_name="M. Torres",
                organization="Sierra Spectra",
                findings=[
                    "Peltier module failure — unable to maintain setpoint below 18°C",
                    "Column compartment door sensor intermittent — triggers false 'door open' fault",
                    "Firmware version 2.1.03 — two revisions behind current",
                    "Leak sensor functional",
                    "Communication module (CAN bus) operational",
                ],
                designation="NON-WORKING",
                notes="Peltier replacement required for functional restoration. Door sensor likely ribbon cable issue. Firmware updatable. Unit suitable for parts recovery if repair not economical. Estimated repair cost: $2,800–$3,400.",
            ),
            ServiceRecord(
                instrument_id=g1330b.id,
                record_type="purchase",
                title="Acquired by Sierra Spectra",
                summary="Unit purchased by Sierra Spectra for evaluation. Arrived with original packaging. No accessories or documentation included.",
                service_date=date(2026, 2, 20),
                notes="Purchased to evaluate for shadow lab inventory. Failed intake testing.",
            ),
            ServiceRecord(
                instrument_id=g1330b.id,
                record_type="listing",
                title="Listed for Sale — BioSurplus",
                summary='Originally listed on eBay by BioSurplus Inc. as "Agilent G1330B — Condition Unknown — Returns Accepted." No service documentation provided.',
                service_date=date(2026, 2, 14),
                notes="No SierraTrac record existed at time of original listing.",
            ),
        ]
        db.session.add_all(records_1)

        # ─── Instrument 2: Working G7120A (clean history) ───
        g7120a = Instrument(
            sierratrac_id="ST-2025-01432",
            serial_number="DE83710294",
            model_number="G7120A",
            manufacturer="Agilent Technologies",
            instrument_type="1260 Infinity II High Speed Pump",
            category="UPLC",
            status="WORKING",
            qr_tagged=True,
            verified=True,
            on_consignment=False,
            specs={
                "Flow Range": "0.001–5.0 mL/min",
                "Max Pressure": "600 bar (8700 psi)",
                "Flow Accuracy": "±1.0%",
                "Flow Precision": "≤0.07% RSD",
                "Solvent Channels": "4",
                "Compressibility": "Automatic",
                "Power Requirements": "100–240V, 50/60Hz",
                "Weight": "14.2 kg",
            },
        )
        db.session.add(g7120a)
        db.session.flush()

        records_2 = [
            ServiceRecord(
                instrument_id=g7120a.id,
                record_type="service",
                title="Preventive Maintenance — Annual",
                summary="Annual PM completed on-site. All seals, check valves, and inlet filters replaced per manufacturer schedule. System purged and pressure-tested at 600 bar.",
                service_date=date(2026, 1, 15),
                engineer_name="R. Kim",
                organization="Sierra Spectra",
                findings=[
                    "All check valves replaced — within expected wear range",
                    "Piston seals replaced — minor scoring on primary piston (normal)",
                    "Pressure ripple within spec at all flow rates tested",
                    "Purge valve actuator responsive — no issues",
                    "Firmware current — version 3.4.12",
                ],
                designation="WORKING",
                notes="System performing within all OEM specifications. Next PM recommended January 2027.",
            ),
            ServiceRecord(
                instrument_id=g7120a.id,
                record_type="service",
                title="Emergency Repair — Pressure Fault",
                summary="Client reported E.PRES error during overnight batch run. Remote triage identified probable check valve failure. On-site within 4 hours.",
                service_date=date(2025, 8, 8),
                engineer_name="M. Torres",
                organization="Sierra Spectra",
                findings=[
                    "Outlet check valve — inlet ball stuck open (contamination)",
                    "Replaced both inlet and outlet check valves",
                    "Pressure stability restored — tested across 0.1–5.0 mL/min range",
                    "No secondary damage to pistons or seals",
                ],
                designation="WORKING",
                notes="Root cause: particulate contamination from mobile phase prep. Recommended inline filtration. Downtime: 3.5 hours from triage to resolution.",
            ),
            ServiceRecord(
                instrument_id=g7120a.id,
                record_type="qualification",
                title="Installation Qualification (IQ/OQ)",
                summary="Full IQ/OQ performed following instrument relocation from Building A to Building C. GLP documentation package generated.",
                service_date=date(2025, 3, 22),
                engineer_name="R. Kim",
                organization="Sierra Spectra",
                findings=[
                    "Installation verified per Agilent IQ protocol",
                    "Operational qualification — all parameters within spec",
                    "Flow accuracy: ±0.3% (spec: ±1.0%)",
                    "Pressure accuracy: ±2 bar (spec: ±5 bar)",
                    "Carryover test: <0.005% (spec: <0.01%)",
                ],
                designation="WORKING",
                notes="Full IQ/OQ documentation package delivered to client QA. Certificate ST-IQ-2025-0891 issued.",
            ),
            ServiceRecord(
                instrument_id=g7120a.id,
                record_type="inspection",
                title="Intake Inspection — New Client Onboarding",
                summary="Baseline inspection performed as part of Sierra Spectra service contract onboarding.",
                service_date=date(2025, 1, 10),
                engineer_name="M. Torres",
                organization="Sierra Spectra",
                findings=[
                    "Overall condition: Excellent",
                    "Firmware version 3.4.10 — updated on-site to 3.4.12",
                    "All modules communicating correctly via CAN bus",
                    "Previous service history: OEM records only (limited documentation)",
                    "Serial number enrolled in SierraTrac",
                ],
                designation="WORKING",
                notes="Instrument in excellent condition. Baseline established for service contract. Prior OEM records migrated to SierraTrac.",
            ),
        ]
        db.session.add_all(records_2)

        # ─── Default admin user ───
        User.query.delete()
        admin_user = User(
            email="joe@sierraspectra.com",
            name="Joe",
            role="admin",
            organization="Sierra Spectra",
        )
        admin_user.set_password("sierratrac2026")

        engineer_user = User(
            email="m.torres@sierraspectra.com",
            name="M. Torres",
            role="engineer",
            organization="Sierra Spectra",
        )
        engineer_user.set_password("engineer2026")

        db.session.add_all([admin_user, engineer_user])

        db.session.commit()
        print(f"Seeded {Instrument.query.count()} instruments and {ServiceRecord.query.count()} service records.")
        print(f"Seeded {User.query.count()} users.")
        print(f"  Admin login: joe@sierraspectra.com / sierratrac2026")
        print(f"  Engineer login: m.torres@sierraspectra.com / engineer2026")


if __name__ == "__main__":
    seed()
