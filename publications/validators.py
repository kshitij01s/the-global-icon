from django.core.exceptions import ValidationError

MAX_PDF_SIZE = 100 * 1024 * 1024


def validate_pdf(upload):
    if upload.size > MAX_PDF_SIZE:
        raise ValidationError("PDF files must be 100 MB or smaller.")
    header = upload.read(5)
    upload.seek(0)
    if header != b"%PDF-":
        raise ValidationError("Upload a valid PDF file.")
