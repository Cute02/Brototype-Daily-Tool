"""Document Parser (PDF, Docx, Text, Google Drive, Web Links) & AI Topic Extraction Engine."""
import io
import re
import zipfile
import urllib.request
import urllib.parse
from typing import List, Dict, Any, Optional, Tuple

try:
    import pypdf
    PYPDF_AVAILABLE = True
except ImportError:
    PYPDF_AVAILABLE = False


def fetch_bytes_from_url(url: str) -> Tuple[bytes, str]:
    """Fetch raw document bytes from Google Drive, Google Docs, or HTTP URL."""
    url = url.strip()
    if not url.startswith("http://") and not url.startswith("https://"):
        raise ValueError("Invalid URL. Must start with http:// or https://")

    filename = "downloaded_document"

    # Transform Google Docs sharing URL into direct export link
    gdoc_match = re.search(r"docs\.google\.com/document/d/([a-zA-Z0-9_-]+)", url)
    if gdoc_match:
        doc_id = gdoc_match.group(1)
        url = f"https://docs.google.com/document/d/{doc_id}/export?format=txt"
        filename = f"Google_Doc_{doc_id[:8]}.txt"

    # Transform Google Drive file link into direct download link
    gdrive_match = re.search(r"drive\.google\.com/file/d/([a-zA-Z0-9_-]+)", url)
    if gdrive_match:
        file_id = gdrive_match.group(1)
        url = f"https://drive.google.com/uc?id={file_id}&export=download"
        filename = f"Google_Drive_{file_id[:8]}.pdf"

    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
    )
    with urllib.request.urlopen(req, timeout=15) as response:
        content_bytes = response.read()
        cd_header = response.headers.get("Content-Disposition", "")
        if "filename=" in cd_header:
            match_fn = re.search(r'filename=["\']?([^"\';]+)["\']?', cd_header)
            if match_fn:
                filename = match_fn.group(1)

    return content_bytes, filename


def extract_raw_text_from_pdf(pdf_bytes: bytes) -> str:
    """Extract raw text content from PDF binary stream."""
    if not pdf_bytes:
        return ""

    text = ""

    # Try pypdf first if available
    if PYPDF_AVAILABLE:
        try:
            reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
            extracted_pages = []
            for page in reader.pages:
                page_text = page.extract_text() or ""
                if page_text.strip():
                    extracted_pages.append(page_text)
            if extracted_pages:
                text = "\n".join(extracted_pages)
        except Exception:
            text = ""

    # Fallback to direct stream regex text extraction if pypdf didn't produce text
    if not text.strip():
        try:
            raw_str = pdf_bytes.decode("latin-1", errors="ignore")
            # Extract text blocks inside PDF parentheses (Tj / TJ operators)
            text_blocks = re.findall(r"\(([^()]{2,})\)\s*TJ|\(([^()]{2,})\)\s*Tj", raw_str)
            flat_blocks = []
            for item in text_blocks:
                match = item[0] or item[1]
                if match:
                    flat_blocks.append(match)
            if flat_blocks:
                text = "\n".join(flat_blocks)
            else:
                printable_lines = re.findall(r"[A-Za-z0-9\s.,:\-_\(\)\/]{4,}", raw_str)
                text = "\n".join(printable_lines)
        except Exception:
            text = ""

    return text.strip()


def extract_raw_text_from_docx(docx_bytes: bytes) -> str:
    """Extract raw text content from DOCX file binary stream."""
    try:
        with zipfile.ZipFile(io.BytesIO(docx_bytes)) as zf:
            xml_content = zf.read("word/document.xml").decode("utf-8", errors="ignore")
            paragraphs = re.findall(r"<w:p\b[^>]*>(.*?)</w:p>", xml_content, re.DOTALL)
            text_lines = []
            for p in paragraphs:
                texts = re.findall(r"<w:t\b[^>]*>(.*?)</w:t>", p, re.DOTALL)
                full_p = "".join(texts).strip()
                if full_p:
                    text_lines.append(full_p)
            return "\n".join(text_lines)
    except Exception:
        return ""


def extract_text_from_bytes(file_bytes: bytes, filename: str = "") -> str:
    """Extract text from PDF, DOCX, TXT, or MD files."""
    fn_lower = filename.lower()
    if fn_lower.endswith(".docx") or fn_lower.endswith(".doc"):
        text = extract_raw_text_from_docx(file_bytes)
        if text.strip():
            return text

    if fn_lower.endswith(".pdf") or file_bytes.startswith(b"%PDF"):
        return extract_raw_text_from_pdf(file_bytes)

    # Fallback to UTF-8 / latin-1 plain text / markdown text parsing
    try:
        return file_bytes.decode("utf-8").strip()
    except UnicodeDecodeError:
        try:
            return file_bytes.decode("latin-1", errors="ignore").strip()
        except Exception:
            return extract_raw_text_from_pdf(file_bytes)


def infer_priority(topic_title: str, text_context: str) -> str:
    """AI heuristic rule to classify topic priority (High, Medium, Low)."""
    combined = f"{topic_title} {text_context}".lower()

    high_keywords = [
        "high", "critical", "important", "assessment", "exam", "project", "architecture",
        "database", "security", "auth", "core", "advanced", "challenge", "milestone", "final"
    ]
    low_keywords = [
        "low", "intro", "introduction", "overview", "setup", "installation", "prerequisite",
        "q&a", "recap", "summary", "conclusion", "optional", "bonus"
    ]

    for kw in high_keywords:
        if kw in combined:
            return "High"

    for kw in low_keywords:
        if kw in combined:
            return "Low"

    return "Medium"


def infer_duration(topic_title: str, text_context: str) -> str:
    """AI heuristic rule to assign duration (30 mins, 1 hr, 2 hrs, 3 hrs)."""
    combined = f"{topic_title} {text_context}".lower()

    match_mins = re.search(r"(\d+)\s*(?:mins?|minutes?|m\b)", combined)
    if match_mins:
        val = int(match_mins.group(1))
        if val <= 45:
            return "30 mins"
        elif val <= 90:
            return "1 hr"
        elif val <= 150:
            return "2 hrs"
        else:
            return "3 hrs"

    match_hrs = re.search(r"(\d+(?:\.\d+)?)\s*(?:hrs?|hours?|h\b)", combined)
    if match_hrs:
        val = float(match_hrs.group(1))
        if val <= 0.75:
            return "30 mins"
        elif val <= 1.5:
            return "1 hr"
        elif val <= 2.5:
            return "2 hrs"
        else:
            return "3 hrs"

    if any(k in combined for k in ["project", "architecture", "building", "comprehensive", "full stack", "assessment"]):
        return "3 hrs"
    elif any(k in combined for k in ["advanced", "deep dive", "implement", "integration", "crud", "database"]):
        return "2 hrs"
    elif any(k in combined for k in ["intro", "setup", "overview", "basics", "quick"]):
        return "30 mins"

    return "1 hr"


def parse_pdf_to_tasks(pdf_bytes: bytes, filename: str = "") -> List[Dict[str, Any]]:
    """Parse Document/PDF binary content and return structured candidate tasks list."""
    raw_text = extract_text_from_bytes(pdf_bytes, filename=filename)
    if not raw_text:
        fallback_title = f"Review Syllabus: {filename}" if filename else "Review Uploaded Document"
        return [{
            "title": fallback_title,
            "category": "Module Import",
            "priority": "Medium",
            "duration": "1 hr",
            "notes": "Document imported. Please add detailed sub-topics.",
            "status": "Pending"
        }]

    lines = [line.strip() for line in raw_text.splitlines() if line.strip()]

    tasks: List[Dict[str, Any]] = []
    current_module = "Module Import"
    if filename:
        clean_fn = re.sub(r"\.[^.]+$", "", filename).replace("_", " ").replace("-", " ")
        current_module = f"Module: {clean_fn.title()}"

    module_header_pattern = re.compile(r"^(?:Module|Chapter|Unit|Day|Section|Part)\s*\d+[:\-]?\s*(.*)$", re.IGNORECASE)
    bullet_pattern = re.compile(r"^(?:[\•\*\-\–\—\>]\s*|\d+[\.\)]\s*)(.+)$")

    for i, line in enumerate(lines):
        mod_match = module_header_pattern.match(line)
        if mod_match:
            mod_title = mod_match.group(1).strip()
            current_module = f"Module: {mod_title}" if mod_title else line
            continue

        bullet_match = bullet_pattern.match(line)
        is_topic_candidate = False
        topic_title = ""

        if bullet_match:
            topic_title = bullet_match.group(1).strip()
            is_topic_candidate = True
        elif 5 <= len(line) <= 120 and not line.endswith(":") and not re.match(r"^Page \d+", line, re.IGNORECASE):
            if line.istitle() or re.match(r"^[A-Z0-9]", line):
                topic_title = line
                is_topic_candidate = True

        if is_topic_candidate and len(topic_title) >= 3:
            next_context = lines[i + 1] if i + 1 < len(lines) else ""
            priority = infer_priority(topic_title, next_context)
            duration = infer_duration(topic_title, next_context)

            tasks.append({
                "title": topic_title,
                "category": current_module,
                "priority": priority,
                "duration": duration,
                "notes": f"Extracted from {filename or 'document'}. Topic: {topic_title}",
                "status": "Pending"
            })

    if not tasks:
        meaningful_lines = [l for l in lines if len(l) > 10 and not re.match(r"^Page \d+", l, re.IGNORECASE)]
        for chunk in meaningful_lines[:10]:
            tasks.append({
                "title": chunk[:80] + ("..." if len(chunk) > 80 else ""),
                "category": current_module,
                "priority": infer_priority(chunk, ""),
                "duration": infer_duration(chunk, ""),
                "notes": chunk,
                "status": "Pending"
            })

    seen_titles = set()
    unique_tasks = []
    for t in tasks:
        t_key = t["title"].lower()
        if t_key not in seen_titles:
            seen_titles.add(t_key)
            unique_tasks.append(t)

    return unique_tasks
