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


try:
    import fitz  # PyMuPDF
    FITZ_AVAILABLE = True
except ImportError:
    FITZ_AVAILABLE = False

try:
    import docx
    DOCX_AVAILABLE = True
except ImportError:
    DOCX_AVAILABLE = False


def extract_formatted_spans_from_pdf(pdf_bytes: bytes) -> List[Dict[str, Any]]:
    """Extract line text, font size, and bold flag from PDF using PyMuPDF or pypdf."""
    if not pdf_bytes:
        return []

    spans = []

    if FITZ_AVAILABLE:
        try:
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            for page in doc:
                blocks = page.get_text("dict").get("blocks", [])
                for b in blocks:
                    for line in b.get("lines", []):
                        line_text = ""
                        max_size = 0.0
                        is_bold = False
                        for s in line.get("spans", []):
                            t = s.get("text", "").strip()
                            if not t:
                                continue
                            line_text += (" " if line_text else "") + t
                            sz = float(s.get("size", 0.0))
                            if sz > max_size:
                                max_size = sz
                            font_name = str(s.get("font", "")).lower()
                            flags = s.get("flags", 0)
                            if (flags & (1 << 4)) or any(b_kw in font_name for b_kw in ["bold", "black", "heavy", "bd", "b+"]):
                                is_bold = True

                        if line_text:
                            spans.append({"text": line_text, "size": max_size, "is_bold": is_bold})
            if spans:
                return spans
        except Exception as e:
            print(f"[PDF Format Parser Warning] PyMuPDF fitz parsing fallback: {e}")

    if PYPDF_AVAILABLE:
        try:
            reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
            for page in reader.pages:
                lines_data = []

                def visitor_body(text, cm, tm, font_dict, font_size):
                    if not text or not text.strip():
                        return
                    clean_t = text.strip()
                    sz = float(font_size) if font_size else 10.0
                    font_name = ""
                    if font_dict:
                        font_name = str(font_dict.get("/BaseFont", "") or font_dict.get("/Name", "")).lower()
                    is_bold = any(b_kw in font_name for b_kw in ["bold", "black", "heavy", "bd", "b+"])
                    lines_data.append({"text": clean_t, "size": sz, "is_bold": is_bold})

                page.extract_text(visitor_text=visitor_body)
                spans.extend(lines_data)
        except Exception:
            pass

    return spans


def extract_formatted_spans_from_docx(docx_bytes: bytes) -> List[Dict[str, Any]]:
    """Extract line text, font size, and bold flag from DOCX using python-docx or XML parsing."""
    if not docx_bytes:
        return []

    spans = []

    if DOCX_AVAILABLE:
        try:
            doc = docx.Document(io.BytesIO(docx_bytes))
            for p in doc.paragraphs:
                p_text = p.text.strip()
                if not p_text:
                    continue

                max_size = 10.0
                is_bold = False
                style_name = str(p.style.name).lower() if p.style else ""

                if "heading 1" in style_name:
                    max_size = 18.0
                    is_bold = True
                elif "heading 2" in style_name or "heading 3" in style_name:
                    max_size = 14.0
                    is_bold = True
                elif "heading" in style_name or "title" in style_name:
                    max_size = 16.0
                    is_bold = True

                for r in p.runs:
                    if r.font and r.font.size:
                        sz_pt = float(r.font.size.pt)
                        if sz_pt > max_size:
                            max_size = sz_pt
                    if r.bold:
                        is_bold = True

                spans.append({"text": p_text, "size": max_size, "is_bold": is_bold})
            if spans:
                return spans
        except Exception as e:
            print(f"[DOCX Format Parser Warning] python-docx parsing fallback: {e}")

    # Fallback to XML regex parsing
    try:
        with zipfile.ZipFile(io.BytesIO(docx_bytes)) as z:
            xml_content = z.read("word/document.xml").decode("utf-8", errors="ignore")
            # Extract paragraphs <w:p>
            p_blocks = re.findall(r"<w:p\b[^>]*>(.*?)</w:p>", xml_content, re.DOTALL)
            for p_xml in p_blocks:
                # Extract text
                texts = re.findall(r"<w:t\b[^>]*>(.*?)</w:t>", p_xml, re.DOTALL)
                p_text = "".join(texts).strip()
                if not p_text:
                    continue

                is_bold = "<w:b/>" in p_xml or "<w:b " in p_xml
                sz_match = re.search(r'<w:sz w:val="(\d+)"', p_xml)
                sz = float(sz_match.group(1)) / 2.0 if sz_match else 10.0
                if "heading" in p_xml.lower() or "title" in p_xml.lower():
                    is_bold = True
                    sz = max(sz, 14.0)

                spans.append({"text": p_text, "size": sz, "is_bold": is_bold})
    except Exception:
        pass

    return spans


def extract_formatting_hierarchy(spans: List[Dict[str, Any]], filename: str = "") -> List[Dict[str, Any]]:
    """
    Dynamically compute font-size distribution (topics = largest/bold text, subtopics = smaller text),
    and extract structured main topics with nested subtopics lists.
    """
    if not spans:
        return []

    # Clean and filter spans
    clean_spans = []
    for s in spans:
        t = s["text"].strip()
        if not t or t.lower().startswith("page ") or re.match(r"^https?:", t):
            continue
        clean_spans.append({"text": t, "size": float(s.get("size", 10.0)), "is_bold": bool(s.get("is_bold", False))})

    if not clean_spans:
        return []

    # Compute font size distribution
    sizes = [s["size"] for s in clean_spans if s["size"] > 0]
    min_size = min(sizes) if sizes else 10.0
    max_size = max(sizes) if sizes else 10.0

    # Determine topic font threshold
    if max_size > min_size + 1.0:
        # Document has distinct font size variations
        sorted_sizes = sorted(sizes)
        # Cutoff at 70th percentile or max_size - 2
        p70_idx = int(len(sorted_sizes) * 0.70)
        topic_size_cutoff = max(sorted_sizes[p70_idx], max_size - 2.0)
    else:
        # Uniform font size across document
        topic_size_cutoff = max_size + 1.0  # rely primarily on bold flags

    clean_fn = re.sub(r"\.[^.]+$", "", filename).replace("_", " ").replace("-", " ") if filename else "Import"
    current_module = f"Module: {clean_fn.title()}"

    tasks = []
    current_task: Optional[Dict[str, Any]] = None

    for s in clean_spans:
        text = s["text"]
        size = s["size"]
        is_bold = s["is_bold"]

        is_topic = False
        # Check topic criteria: Large font size OR (Bold + font size > min_size) OR numbered header (1. Topic)
        if size >= topic_size_cutoff:
            is_topic = True
        elif is_bold and size > min_size:
            is_topic = True
        elif re.match(r"^(?:Module|Chapter|Unit|Day|Section|Part|\d+[\.\:\)])\s*", text, re.IGNORECASE) and len(text) <= 80:
            is_topic = True

        if is_topic:
            topic_title = re.sub(r"^(?:Module|Chapter|Unit|Day|Section|Part|\d+[\.\:\)])\s*", "", text, flags=re.IGNORECASE).strip() or text
            prio = infer_priority(topic_title, "", is_highlighted=is_bold)
            dur = infer_duration(topic_title, "")

            current_task = {
                "title": topic_title,
                "category": current_module,
                "priority": prio,
                "duration": dur,
                "notes": f"Extracted from {filename or 'document'}.",
                "status": "Pending",
                "is_highlighted": is_bold,
                "subtopics": []
            }
            tasks.append(current_task)
        else:
            # Subtopic line under current topic
            if current_task is None:
                # First line was not marked as topic; create initial topic from filename or first line
                current_task = {
                    "title": text,
                    "category": current_module,
                    "priority": "Medium",
                    "duration": "1 hr",
                    "notes": f"Extracted from {filename or 'document'}.",
                    "status": "Pending",
                    "is_highlighted": False,
                    "subtopics": []
                }
                tasks.append(current_task)
            else:
                sub_clean = re.sub(r"^(?:[\•\*\-\–\—\>\+\▪\▫\◦\⁃]|\d+[\.\:\-]\d*|[a-z0-9][\.\)])\s*", "", text).strip()
                if sub_clean:
                    sub_id = f"sub_{len(current_task['subtopics']) + 1}"
                    current_task["subtopics"].append({
                        "id": sub_id,
                        "title": sub_clean,
                        "completed": False
                    })

    # Ambiguous document fallback: if no subtopics were extracted at all, wrap under single topic
    if not tasks:
        tasks = [{
            "title": f"Syllabus: {clean_fn.title()}",
            "category": current_module,
            "priority": "Medium",
            "duration": "1 hr",
            "notes": "Imported document content.",
            "status": "Pending",
            "is_highlighted": False,
            "subtopics": []
        }]

    return tasks



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


HF_API_URL_TEMPLATE = "https://api-inference.huggingface.co/models/{model_id}"
DEFAULT_HF_MODEL = "mistralai/Mistral-7B-Instruct-v0.2"


def _chunk_text(text: str, max_chars: int = 3500) -> List[str]:
    """Split raw text into chunks of at most max_chars, breaking on line boundaries."""
    text = text.strip()
    if len(text) <= max_chars:
        return [text]

    chunks = []
    lines = text.splitlines()
    current_chunk = []
    current_length = 0

    for line in lines:
        if current_length + len(line) + 1 > max_chars and current_chunk:
            chunks.append("\n".join(current_chunk))
            current_chunk = []
            current_length = 0

        current_chunk.append(line)
        current_length += len(line) + 1

    if current_chunk:
        chunks.append("\n".join(current_chunk))

    return chunks


def _validate_and_parse_hf_json(response_text: str) -> Optional[List[Dict[str, Any]]]:
    """Parse and validate HF model JSON response matching {"topics": [{"title": "...", "subtopics": [...]}]}."""
    if not response_text or not response_text.strip():
        return None

    # Search for JSON object matching {"topics": [...]}
    json_match = re.search(r"\{\s*\"topics\"\s*:\s*\[.*\]\s*\}", response_text, re.DOTALL)
    if not json_match:
        # Fallback search for any outer JSON object
        json_match = re.search(r"\{.*\}", response_text, re.DOTALL)

    if not json_match:
        return None

    try:
        data = json.loads(json_match.group(0))
        if isinstance(data, dict) and "topics" in data and isinstance(data["topics"], list):
            valid_topics = []
            for t in data["topics"]:
                if isinstance(t, dict) and "title" in t:
                    title = str(t["title"]).strip()
                    subtopics = [str(st).strip() for st in t.get("subtopics", []) if str(st).strip()]
                    if title:
                        valid_topics.append({"title": title, "subtopics": subtopics})
            if valid_topics:
                return valid_topics
    except Exception:
        pass

    return None


def extract_subtopics_with_hf_ai(
    raw_text: str,
    filename: str = "",
    hf_token: Optional[str] = None,
    hf_model: Optional[str] = None
) -> Optional[List[Dict[str, Any]]]:
    """
    Synchronous AI Extraction Pipeline:
    1. Reads HF_API_KEY / HF_API_TOKEN and HF_MODEL_ID from environment or parameters.
    2. Chunks raw text into ~3500 character segments to respect LLM context windows.
    3. Sends prompt asking for strictly formatted JSON object:
       {"topics": [{"title": "string", "subtopics": ["string"]}]}
    4. Parses and validates JSON response. Retries ONCE with a strict prompt if JSON is invalid.
    5. Merges and deduplicates topics/subtopics across chunks.
    6. Returns structured Task models populated with main topics and nested AI subtopics.
    """
    import os

    token = (hf_token or os.environ.get("HF_API_KEY") or os.environ.get("HF_API_TOKEN", "")).strip()
    model = (hf_model or os.environ.get("HF_MODEL_ID", DEFAULT_HF_MODEL)).strip()

    if not token:
        return None

    api_url = HF_API_URL_TEMPLATE.format(model_id=model)
    chunks = _chunk_text(raw_text, max_chars=3500)
    merged_topics_dict: Dict[str, Set[str]] = {}  # topic_title_lower -> set of subtopics
    topic_display_titles: Dict[str, str] = {}     # topic_title_lower -> original title

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    for chunk in chunks:
        base_prompt = (
            "Extract main topics and subtopics from the text below.\n"
            "Return ONLY a valid JSON object matching this exact shape:\n"
            "{\n"
            '  "topics": [\n'
            '    {\n'
            '      "title": "Main Topic Name",\n'
            '      "subtopics": ["Subtopic 1", "Subtopic 2"]\n'
            "    }\n"
            "  ]\n"
            "}\n"
            "Do NOT include markdown formatting, backticks, or intro commentary.\n\n"
            f"Document Text:\n{chunk}"
        )

        prompt = f"[INST] {base_prompt} [/INST]" if "mistral" in model.lower() or "llama" in model.lower() else base_prompt

        topics_from_chunk = None

        for attempt in range(2):
            if attempt == 1:
                # Retry prompt with stricter instruction
                strict_prompt = (
                    "STRICT INSTRUCTION: Your previous output was invalid.\n"
                    "Return ONLY a valid raw JSON object matching exact format:\n"
                    '{"topics": [{"title": "string", "subtopics": ["string"]}]}\n'
                    f"Document Text:\n{chunk[:2000]}"
                )
                prompt = f"[INST] {strict_prompt} [/INST]" if "mistral" in model.lower() else strict_prompt

            payload = json.dumps({
                "inputs": prompt,
                "parameters": {
                    "max_new_tokens": 1000,
                    "temperature": 0.1,
                    "return_full_text": False
                }
            }).encode("utf-8")

            try:
                req = urllib.request.Request(api_url, headers=headers, data=payload)
                with urllib.request.urlopen(req, timeout=20) as resp:
                    raw_res = resp.read().decode("utf-8")
                    resp_data = json.loads(raw_res)

                    generated_text = ""
                    if isinstance(resp_data, list) and len(resp_data) > 0:
                        generated_text = resp_data[0].get("generated_text", "")
                    elif isinstance(resp_data, dict):
                        generated_text = resp_data.get("generated_text", "")

                    topics_from_chunk = _validate_and_parse_hf_json(generated_text)
                    if topics_from_chunk:
                        break  # Successful extraction
            except urllib.error.HTTPError as http_err:
                if http_err.code == 401:
                    raise RuntimeError("Hugging Face API Authentication Error: Invalid API Key")
                elif http_err.code == 429:
                    raise RuntimeError("Hugging Face API Rate Limit Exceeded. Please try again later.")
                elif http_err.code == 503:
                    raise RuntimeError("Hugging Face AI Model is loading or busy. Please retry in a few seconds.")
                else:
                    print(f"[HF AI Extractor] HTTP Error {http_err.code}: {http_err.reason}")
            except Exception as e:
                print(f"[HF AI Extractor Attempt {attempt + 1} failed]: {e}")

        # Merge extracted topics & subtopics from this chunk
        if topics_from_chunk:
            for top in topics_from_chunk:
                t_title = top["title"]
                t_lower = t_title.lower()
                if t_lower not in merged_topics_dict:
                    merged_topics_dict[t_lower] = set()
                    topic_display_titles[t_lower] = t_title

                for sub in top.get("subtopics", []):
                    if sub.strip():
                        merged_topics_dict[t_lower].add(sub.strip())

    if not merged_topics_dict:
        return None

    # Construct final task list with deduplicated topics and subtopics
    clean_fn = re.sub(r"\.[^.]+$", "", filename).replace("_", " ").replace("-", " ") if filename else "Import"
    category_name = f"Module: {clean_fn.title()}"
    tasks = []

    for idx, (t_lower, sub_set) in enumerate(merged_topics_dict.items()):
        main_title = topic_display_titles[t_lower]
        subtopics_list = [
            {"id": f"sub_{s_idx + 1}", "title": sub_title, "completed": False}
            for s_idx, sub_title in enumerate(sorted(list(sub_set)))
        ]

        tasks.append({
            "title": main_title,
            "category": category_name,
            "priority": infer_priority(main_title, ""),
            "duration": infer_duration(main_title, ""),
            "notes": f"AI Extracted via Hugging Face ({model})",
            "status": "Pending",
            "is_highlighted": False,
            "subtopics": subtopics_list
        })

    return tasks



def parse_pdf_to_tasks(
    pdf_bytes: bytes,
    filename: str = "",
    hf_token: Optional[str] = None,
    hf_model: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Parse Document/PDF content synchronously using font-size & bold formatting hierarchy extraction.
    Dynamically computes topic vs subtopic clusters based on text size/weight distribution.
    """
    if not pdf_bytes:
        fallback_title = f"Review Syllabus: {filename}" if filename else "Review Uploaded Document"
        return [{
            "title": fallback_title,
            "category": "Module Import",
            "priority": "Medium",
            "duration": "1 hr",
            "notes": "Document imported. Subtopics automatically generated.",
            "status": "Pending",
            "is_highlighted": False,
            "subtopics": []
        }]

    # Optional HF AI extraction (default OFF unless ENABLE_HF_AI=true or token explicitly passed)
    import os
    if os.environ.get("ENABLE_HF_AI", "").lower() in ("true", "1") and (hf_token or os.environ.get("HF_API_KEY")):
        raw_text, _ = extract_text_and_highlights_from_bytes(pdf_bytes, filename=filename)
        ai_tasks = extract_subtopics_with_hf_ai(raw_text, filename=filename, hf_token=hf_token, hf_model=hf_model)
        if ai_tasks:
            return ai_tasks

    # Primary Synchronous Extraction Pipeline: Formatting-based (PyMuPDF fitz / python-docx / PyPDF / XML)
    fn_lower = filename.lower()
    if fn_lower.endswith(".docx"):
        spans = extract_formatted_spans_from_docx(pdf_bytes)
    elif fn_lower.endswith(".pdf") or pdf_bytes.startswith(b"%PDF"):
        spans = extract_formatted_spans_from_pdf(pdf_bytes)
    else:
        # Text file / general bytes
        try:
            raw_text = pdf_bytes.decode("utf-8", errors="ignore")
            lines = [l.strip() for l in raw_text.splitlines() if l.strip()]
            spans = [{"text": l, "size": 10.0, "is_bold": False} for l in lines]
        except Exception:
            spans = []

    tasks = extract_formatting_hierarchy(spans, filename=filename)
    if tasks:
        return tasks

    # Fallback if no spans found
    clean_fn = re.sub(r"\.[^.]+$", "", filename).replace("_", " ").replace("-", " ") if filename else "Import"
    return [{
        "title": f"Study Syllabus: {clean_fn.title()}",
        "category": f"Module: {clean_fn.title()}",
        "priority": "Medium",
        "duration": "1 hr",
        "notes": "Imported document content.",
        "status": "Pending",
        "is_highlighted": False,
        "subtopics": []
    }]


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
