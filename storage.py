import os
import uuid
from werkzeug.utils import secure_filename
from flask import current_app


def allowed_file(filename):
    """Check if file extension is allowed."""
    return (
        "." in filename
        and filename.rsplit(".", 1)[1].lower()
        in current_app.config["ALLOWED_EXTENSIONS"]
    )


def generate_blob_name(filename):
    """Generate unique blob name preserving extension."""
    ext = filename.rsplit(".", 1)[1].lower()
    return f"{uuid.uuid4().hex}.{ext}"


def upload_photo(file, instrument_sn):
    """
    Upload photo to storage.
    Returns (storage_url, filename, file_size, content_type).

    In development: saves to static/uploads/
    In production: uploads to Azure Blob Storage
    """
    if not file or not allowed_file(file.filename):
        raise ValueError(f"Invalid file type. Allowed: {current_app.config['ALLOWED_EXTENSIONS']}")

    original_filename = secure_filename(file.filename)
    blob_name = generate_blob_name(original_filename)
    content_type = file.content_type or "application/octet-stream"

    if current_app.config.get("USE_LOCAL_STORAGE"):
        return _upload_local(file, blob_name, instrument_sn, original_filename, content_type)
    else:
        return _upload_azure(file, blob_name, instrument_sn, original_filename, content_type)


def _upload_local(file, blob_name, instrument_sn, original_filename, content_type):
    """Save to local filesystem during development."""
    upload_dir = os.path.join(current_app.config["LOCAL_UPLOAD_FOLDER"], instrument_sn)
    os.makedirs(upload_dir, exist_ok=True)

    filepath = os.path.join(upload_dir, blob_name)
    file.save(filepath)

    file_size = os.path.getsize(filepath)
    storage_url = f"/static/uploads/{instrument_sn}/{blob_name}"

    return storage_url, original_filename, file_size, content_type


def _upload_azure(file, blob_name, instrument_sn, original_filename, content_type):
    """Upload to Azure Blob Storage."""
    from azure.storage.blob import BlobServiceClient, ContentSettings

    connection_string = current_app.config["AZURE_STORAGE_CONNECTION_STRING"]
    container_name = current_app.config["AZURE_CONTAINER_NAME"]

    blob_service = BlobServiceClient.from_connection_string(connection_string)
    container = blob_service.get_container_client(container_name)

    # Organize blobs by instrument serial number
    full_blob_name = f"{instrument_sn}/{blob_name}"

    # Read file data
    file_data = file.read()
    file_size = len(file_data)

    # Upload with content type
    blob_client = container.get_blob_client(full_blob_name)
    blob_client.upload_blob(
        file_data,
        content_settings=ContentSettings(content_type=content_type),
        overwrite=True,
    )

    storage_url = blob_client.url
    return storage_url, original_filename, file_size, content_type


def delete_photo(storage_url):
    """Delete photo from storage."""
    if current_app.config.get("USE_LOCAL_STORAGE"):
        # Local: delete file
        local_path = os.path.join(
            os.path.dirname(os.path.abspath(__file__)),
            storage_url.lstrip("/"),
        )
        if os.path.exists(local_path):
            os.remove(local_path)
    else:
        # Azure: delete blob
        from azure.storage.blob import BlobServiceClient

        connection_string = current_app.config["AZURE_STORAGE_CONNECTION_STRING"]
        container_name = current_app.config["AZURE_CONTAINER_NAME"]

        blob_service = BlobServiceClient.from_connection_string(connection_string)
        container = blob_service.get_container_client(container_name)

        # Extract blob name from URL
        blob_name = storage_url.split(f"{container_name}/")[-1]
        blob_client = container.get_blob_client(blob_name)
        blob_client.delete_blob()
