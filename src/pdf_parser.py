"""Document Parser (PDF, Docx, Text, Google Drive, Web Links) & AI Bold/Highlight Extraction Engine."""
import io
import re
import zipfile
import urllib.request
import urllib.parse
from typing import List, Dict, Any, Optional, Tuple, Set

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


def extract_pdf_spans_and_highlights(pdf_bytes: bytes) -> Tuple[str, Set[str]]:
    """Extract text content and set of bold/highlighted text spans from PDF stream."""
    if not pdf_bytes:
        return "", set()

    full_text_pages = []
    highlighted_spans: Set[str] = set()

    if PYPDF_AVAILABLE:
        try:
            reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
            for page in reader.pages:
                # 1. Extract text and detect bold font names via text visitor
                page_text_runs = []

                def visitor_body(text, cm, tm, font_dict, font_size):
                    if not text or not text.strip():
                        return
                    clean_t = text.strip()
                    page_text_runs.append(clean_t)
                    
                    # Detect Bold fonts in PDF font dictionary
                    font_name = ""
                    if font_dict:
                        font_name = str(font_dict.get("/BaseFont", "") or font_dict.get("/Name", "")).lower()
                    if any(b in font_name for b in ["bold", "black", "heavy", "bd", "b+"]):
                        if len(clean_t) >= 3:
                            highlighted_spans.add(clean_t.lower())

                page.extract_text(visitor_text=visitor_body)
                if page_text_runs:
                    full_text_pages.append("\n".join(page_text_runs))

                # 2. Extract PDF Highlight Annotations
                try:
                    annots = page.get("/Annots")
                    if annots:
                        for annot in annots:
                            obj = annot.get_object() if hasattr(annot, "get_object") else annot
                            if obj and obj.get("/Subtype") == "/Highlight":
                                contents = str(obj.get("/Contents", "")).strip()
                                if contents and len(contents) >= 3:
                                    highlighted_spans.add(contents.lower())
                except Exception:
                    pass
        except Exception:
            pass

    text = "\n".join(full_text_pages).strip()

    # Fallback stream regex text extraction if PyPDF produced empty text
    if not text:
        try:
            raw_str = pdf_bytes.decode("latin-1", errors="ignore")
            # Look for bold font object markers in raw PDF stream
            bold_font_matches = re.findall(r"/Font\s*<.*?/BaseFont\s*/[^\s]*[Bb][Oo][Ll][Dd][^\s]*", raw_str)
            if bold_font_matches:
                highlighted_spans.add("bold_detected_in_stream")

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

    return text.strip(), highlighted_spans


def extract_docx_spans_and_highlights(docx_bytes: bytes) -> Tuple[str, Set[str]]:
    """Extract text content and set of bold/highlighted text spans from DOCX stream."""
    highlighted_spans: Set[str] = set()
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

                # Check if paragraph has bold (<w:b/>) or highlight (<w:highlight/>) tags
                if re.search(r"<w:b\b|<w:highlight\b", p):
                    if full_p and len(full_p) >= 3:
                        highlighted_spans.add(full_p.lower())
            return "\n".join(text_lines), highlighted_spans
    except Exception:
        return "", set()


def extract_text_and_highlights_from_bytes(file_bytes: bytes, filename: str = "") -> Tuple[str, Set[str]]:
    """Extract text and detected bold/highlighted terms from PDF, DOCX, TXT, or MD files."""
    fn_lower = filename.lower()
    highlighted_spans: Set[str] = set()

    if fn_lower.endswith(".docx") or fn_lower.endswith(".doc"):
        text, docx_highlights = extract_docx_spans_and_highlights(file_bytes)
        if text.strip():
            return text, docx_highlights

    if fn_lower.endswith(".pdf") or file_bytes.startswith(b"%PDF"):
        return extract_pdf_spans_and_highlights(file_bytes)

    # Markdown / Text bold formatting (**bold** or __bold__)
    try:
        text = file_bytes.decode("utf-8").strip()
    except UnicodeDecodeError:
        try:
            text = file_bytes.decode("latin-1", errors="ignore").strip()
        except Exception:
            text = ""

    md_bolds = re.findall(r"\*\*([^*]{3,})\*\*|__([^_{3,})__|#+\s*(.+)", text)
    for match in md_bolds:
        b_term = (match[0] or match[1] or match[2]).strip()
        if b_term:
            highlighted_spans.add(b_term.lower())

    return text, highlighted_spans


def extract_raw_text_from_pdf(pdf_bytes: bytes) -> str:
    """Extract raw text content from PDF binary stream."""
    text, _ = extract_pdf_spans_and_highlights(pdf_bytes)
    return text


def infer_priority(topic_title: str, text_context: str, is_highlighted: bool = False) -> str:
    """AI heuristic rule to classify topic priority (High, Medium, Low)."""
    if is_highlighted:
        return "High"

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
    """Parse Document/PDF binary content, detect AI bold/highlighted topics, and return structured candidate tasks list."""
    raw_text, highlighted_spans = extract_text_and_highlights_from_bytes(pdf_bytes, filename=filename)
    if not raw_text:
        fallback_title = f"Review Syllabus: {filename}" if filename else "Review Uploaded Document"
        return [{
            "title": fallback_title,
            "category": "Module Import",
            "priority": "Medium",
            "duration": "1 hr",
            "notes": "Document imported. Please add detailed sub-topics.",
            "status": "Pending",
            "is_highlighted": False
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

            # Check if topic title matches any bold or highlighted spans detected in document
            tt_lower = topic_title.lower()
            is_bold_highlight = any(h_span in tt_lower or tt_lower in h_span for h_span in highlighted_spans)

            priority = infer_priority(topic_title, next_context, is_highlighted=is_bold_highlight)
            duration = infer_duration(topic_title, next_context)

            note_suffix = " [✨ AI Bold/Highlighted Topic]" if is_bold_highlight else ""

            tasks.append({
                "title": topic_title,
                "category": current_module,
                "priority": priority,
                "duration": duration,
                "notes": f"Extracted from {filename or 'document'}. Topic: {topic_title}{note_suffix}",
                "status": "Pending",
                "is_highlighted": is_bold_highlight
            })

    if not tasks:
        meaningful_lines = [l for l in lines if len(l) > 10 and not re.match(r"^Page \d+", l, re.IGNORECASE)]
        for chunk in meaningful_lines[:10]:
            chunk_lower = chunk.lower()
            is_bold_highlight = any(h_span in chunk_lower for h_span in highlighted_spans)
            tasks.append({
                "title": chunk[:80] + ("..." if len(chunk) > 80 else ""),
                "category": current_module,
                "priority": infer_priority(chunk, "", is_highlighted=is_bold_highlight),
                "duration": infer_duration(chunk, ""),
                "notes": chunk,
                "status": "Pending",
                "is_highlighted": is_bold_highlight
            })

    seen_titles = set()
    unique_tasks = []
    for t in tasks:
        t_key = t["title"].lower()
        if t_key not in seen_titles:
            seen_titles.add(t_key)
            unique_tasks.append(t)

    return unique_tasks
