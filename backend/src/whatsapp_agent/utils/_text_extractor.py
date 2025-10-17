from PyPDF2 import PdfReader
from docx import Document
from typing import List, Dict, Union
import csv
import io

def _extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extracts text from PDF bytes."""
    pdf_reader = PdfReader(io.BytesIO(file_bytes))
    text = []
    for page in pdf_reader.pages:
        text.append(page.extract_text() or "")
    return "\n".join(text)

def _extract_text_from_docx(file_bytes: bytes) -> str:
    """Extracts text from DOCX bytes."""
    doc = Document(io.BytesIO(file_bytes))
    return "\n".join(para.text for para in doc.paragraphs)

def _extract_csv_content(file_bytes: bytes) -> List[Dict[str, str]]:
    """
    Extracts content from CSV bytes and returns a list of dictionaries.
    Each row is a dict with column headers as keys.
    """
    text_stream = io.StringIO(file_bytes.decode("utf-8", errors="ignore"))
    reader = csv.DictReader(text_stream)
    return [dict(row) for row in reader]


def convert_file_content(filename: str, content: bytes) -> Union[str, List[Dict[str, str]]]:
    """
    Converts supported file types into text (str), except CSV which returns structured data (list of dicts).
    """
    filename = filename.lower()

    if filename.endswith(".txt"):
        return content.decode("utf-8", errors="ignore")
    elif filename.endswith(".pdf"):
        return _extract_text_from_pdf(content)
    elif filename.endswith(".docx"):
        return _extract_text_from_docx(content)
    elif filename.endswith(".csv"):
        return _extract_csv_content(content)
    else:
        raise ValueError(f"Unsupported file type: {filename}")
