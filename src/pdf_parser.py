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
                page_text_runs = []

                def visitor_body(text, cm, tm, font_dict, font_size):
                    if not text or not text.strip():
                        return
                    clean_t = text.strip()
                    page_text_runs.append(clean_t)
                    
                    font_name = ""
                    if font_dict:
                        font_name = str(font_dict.get("/BaseFont", "") or font_dict.get("/Name", "")).lower()
                    if any(b in font_name for b in ["bold", "black", "heavy", "bd", "b+"]):
                        if len(clean_t) >= 3:
                            highlighted_spans.add(clean_t.lower())

                page.extract_text(visitor_text=visitor_body)
                if page_text_runs:
                    full_text_pages.append("\n".join(page_text_runs))

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

    full_raw_text = "\n".join(full_text_pages) if full_text_pages else ""
    return full_raw_text, highlighted_spans


def extract_docx_text(docx_bytes: bytes) -> str:
    """Extract raw text lines from a .docx binary file."""
    try:
        with zipfile.ZipFile(io.BytesIO(docx_bytes)) as z:
            xml_content = z.read("word/document.xml").decode("utf-8", errors="ignore")
            text = re.sub(r"<[^>]+>", "\n", xml_content)
            lines = [l.strip() for l in text.splitlines() if l.strip()]
            return "\n".join(lines)
    except Exception:
        return ""


def extract_text_and_highlights_from_bytes(content_bytes: bytes, filename: str = "") -> Tuple[str, Set[str]]:
    """Determine document format and return extracted text and bold/highlight spans."""
    fn_lower = filename.lower()
    
    if fn_lower.endswith(".docx"):
        text = extract_docx_text(content_bytes)
        return text, set()
    
    if fn_lower.endswith(".pdf") or content_bytes.startswith(b"%PDF"):
        return extract_pdf_spans_and_highlights(content_bytes)
    
    try:
        text = content_bytes.decode("utf-8", errors="ignore")
        return text, set()
    except Exception:
        return "", set()


def infer_priority(title: str, context: str, is_highlighted: bool = False) -> str:
    """Infer task priority level."""
    combined = f"{title} {context}".lower()
    
    if is_highlighted or any(k in combined for k in ["exam", "test", "urgent", "critical", "mandatory", "core", "must"]):
        return "High"
    if any(k in combined for k in ["optional", "extra", "bonus", "secondary", "minor"]):
        return "Low"
    return "Medium"


def infer_duration(title: str, context: str) -> str:
    """Infer duration requirement."""
    combined = f"{title} {context}".lower()
    if any(k in combined for k in ["project", "build", "capstone", "advanced", "architecture"]):
        return "3 hrs"
    if any(k in combined for k in ["practice", "exercise", "lab", "deep dive", "intermediate"]):
        return "2 hrs"
    if any(k in combined for k in ["quick", "overview", "intro", "basics", "reading"]):
        return "30 mins"
    return "1 hr"


def parse_pdf_to_tasks(pdf_bytes: bytes, filename: str = "") -> List[Dict[str, Any]]:
    """Parse Document/PDF binary content, extract main topics and subtopics, and return candidate tasks list."""
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
            "is_highlighted": False,
            "subtopics": []
        }]

    raw_lines = [l for l in raw_text.splitlines() if l.strip()]

    tasks: List[Dict[str, Any]] = []
    current_module = "Module Import"
    if filename:
        clean_fn = re.sub(r"\.[^.]+$", "", filename).replace("_", " ").replace("-", " ")
        current_module = f"Module: {clean_fn.title()}"

    module_header_pattern = re.compile(r"^(?:Module|Chapter|Unit|Day|Section|Part)\s*\d*[:\-]?\s*(.*)$", re.IGNORECASE)
    main_numbered_pattern = re.compile(r"^(?:\d+[\.\:\)]\s*)(.+)$")
    sub_bullet_pattern = re.compile(r"^(?:\d+[\.\:\-]\d+[\.\)]?\s*|[a-z0-9][\.\)]\s*|\([a-z0-9ivx]+\)\s*|[\•\*\-\–\—\>\+\▪\▫\◦\⁃]\s*)(.+)$", re.IGNORECASE)

    current_task: Optional[Dict[str, Any]] = None

    for i, raw_line in enumerate(raw_lines):
        line = raw_line.strip()
        if not line or line.lower().startswith("page ") or re.match(r"^https?:", line):
            continue

        mod_match = module_header_pattern.match(line)
        if mod_match and (":" in line or re.match(r"^(?:Module|Chapter|Unit|Day|Section|Part)\s*\d+", line, re.IGNORECASE)):
            mod_title = mod_match.group(1).strip()
            current_module = f"Module: {mod_title}" if mod_title else line
            current_task = None
            continue

        # Strategy 1: Colon list (e.g. "Main Topic: sub1, sub2, sub3")
        if ":" in line and not line.endswith(":"):
            parts = line.split(":", 1)
            main_part = parts[0].strip()
            sub_part = parts[1].strip()

            main_part_clean = re.sub(r"^(?:\d+[\.\)]\s*|[\•\*\-\–\—\>]\s*)", "", main_part).strip()

            if len(main_part_clean) >= 3 and ("," in sub_part or ";" in sub_part):
                sub_items = [s.strip() for s in re.split(r"[,;]", sub_part) if s.strip()]
                if len(sub_items) >= 2:
                    tt_lower = main_part_clean.lower()
                    is_bold_hl = any(h_span in tt_lower or tt_lower in h_span for h_span in highlighted_spans)
                    prio = infer_priority(main_part_clean, sub_part, is_highlighted=is_bold_hl)
                    dur = infer_duration(main_part_clean, sub_part)

                    subtopics_list = [
                        {"id": f"sub_{s_idx + 1}", "title": s_item, "completed": False}
                        for s_idx, s_item in enumerate(sub_items)
                    ]

                    current_task = {
                        "title": main_part_clean,
                        "category": current_module,
                        "priority": prio,
                        "duration": dur,
                        "notes": f"Extracted from {filename or 'document'}. Topic: {main_part_clean}",
                        "status": "Pending",
                        "is_highlighted": is_bold_hl,
                        "subtopics": subtopics_list
                    }
                    tasks.append(current_task)
                    continue

        # Strategy 2: Explicit subtopic bullet or numbered sub-item (e.g., 1.1, 1.a, - Item)
        sub_match = sub_bullet_pattern.match(line)
        if sub_match and current_task is not None:
            sub_title_clean = sub_match.group(1).strip()
            if len(sub_title_clean) >= 2:
                sub_id = f"sub_{len(current_task['subtopics']) + 1}"
                current_task["subtopics"].append({
                    "id": sub_id,
                    "title": sub_title_clean,
                    "completed": False
                })
                continue

        # Strategy 3: Main Topic vs Subtopic Hierarchy
        main_num_match = main_numbered_pattern.match(line)
        tt_lower = line.lower()
        is_bold_highlight = any(h_span in tt_lower or tt_lower in h_span for h_span in highlighted_spans)

        is_new_main = False
        topic_title = line

        if main_num_match:
            topic_title = main_num_match.group(1).strip()
            is_new_main = True
        elif is_bold_highlight or line.endswith(":") or re.match(r"^(?:Topic|Module|Unit|Day)\s*\d*", line, re.IGNORECASE):
            topic_title = line.rstrip(":")
            is_new_main = True
        elif current_task is None:
            topic_title = line
            is_new_main = True

        if is_new_main:
            next_context = raw_lines[i + 1].strip() if i + 1 < len(raw_lines) else ""
            priority = infer_priority(topic_title, next_context, is_highlighted=is_bold_highlight)
            duration = infer_duration(topic_title, next_context)

            current_task = {
                "title": topic_title,
                "category": current_module,
                "priority": priority,
                "duration": duration,
                "notes": f"Extracted topic from {filename or 'document'}.",
                "status": "Pending",
                "is_highlighted": is_bold_highlight,
                "subtopics": []
            }
            tasks.append(current_task)
        elif current_task is not None:
            # Subtopic under current_task
            sub_id = f"sub_{len(current_task['subtopics']) + 1}"
            current_task["subtopics"].append({
                "id": sub_id,
                "title": line,
                "completed": False
            })

    if not tasks:
        tasks = [{
            "title": f"Study Syllabus: {filename}" if filename else "Study Document",
            "category": current_module,
            "priority": "Medium",
            "duration": "1 hr",
            "notes": "Imported document text.",
            "status": "Pending",
            "is_highlighted": False,
            "subtopics": []
        }]

    return tasks
