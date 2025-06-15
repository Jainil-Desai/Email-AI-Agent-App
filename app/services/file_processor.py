import fitz  # PyMuPDF
import docx
import csv
import pandas as pd

class FileProcessor:
    def __init__(self):
        pass

    def extract_text(self, file_path):
        """Extract text from various file formats"""
        if file_path.endswith(".pdf"):
            return self._extract_text_from_pdf(file_path)
        elif file_path.endswith(".docx"):
            return self._extract_text_from_docx(file_path)
        elif file_path.endswith(".txt"):
            return self._extract_text_from_txt(file_path)
        elif file_path.endswith(".csv"):
            return self._extract_text_from_csv(file_path)
        elif file_path.endswith(".xlsx"):
            return self._extract_text_from_xlsx(file_path)
        else:
            return f"[Unsupported file type: {file_path}]"

    def _extract_text_from_pdf(self, file_path):
        """Extract text from PDF using PyMuPDF"""
        try:
            doc = fitz.open(file_path)
            return "\n".join([page.get_text() for page in doc])
        except Exception as e:
            return f"[Error reading PDF: {e}]"

    def _extract_text_from_docx(self, file_path):
        """Extract text from Word documents"""
        try:
            doc = docx.Document(file_path)
            return "\n".join([para.text for para in doc.paragraphs])
        except Exception as e:
            return f"[Error reading DOCX: {e}]"

    def _extract_text_from_txt(self, file_path):
        """Extract text from plain text files"""
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                return f.read()
        except Exception as e:
            return f"[Error reading TXT: {e}]"

    def _extract_text_from_csv(self, file_path):
        """Extract text from CSV files"""
        try:
            lines = []
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                reader = csv.reader(f)
                for row in reader:
                    lines.append(", ".join(row))
            return "\n".join(lines)
        except Exception as e:
            return f"[Error reading CSV: {e}]"

    def _extract_text_from_xlsx(self, file_path):
        """Extract text from Excel files"""
        try:
            df = pd.read_excel(file_path, sheet_name=None)
            content = []
            for sheet, data in df.items():
                content.append(f"Sheet: {sheet}")
                content.append(data.to_string(index=False))
            return "\n\n".join(content)
        except Exception as e:
            return f"[Error reading XLSX: {e}]" 