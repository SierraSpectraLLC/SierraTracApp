import os
from flask import Flask
from flask_migrate import Migrate
from models import db
from routes import main, api
from admin_routes import admin
from config import config


def create_app(config_name=None):
    """Application factory."""
    if config_name is None:
        config_name = os.environ.get("FLASK_ENV", "default")

    app = Flask(__name__)
    app.config.from_object(config[config_name])

    # Initialize extensions
    db.init_app(app)
    Migrate(app, db)

    # Register blueprints
    app.register_blueprint(main)
    app.register_blueprint(api)
    app.register_blueprint(admin)

    # Create upload directory in dev mode
    if app.config.get("USE_LOCAL_STORAGE"):
        os.makedirs(app.config.get("LOCAL_UPLOAD_FOLDER", "static/uploads"), exist_ok=True)

    # Create tables in dev only — production uses flask db upgrade via startup.sh
    with app.app_context():
        if app.config.get("USE_LOCAL_STORAGE"):
            db.create_all()

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(debug=True, port=5000)
