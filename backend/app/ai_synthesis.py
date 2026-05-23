import json
import logging
from dataclasses import dataclass
from typing import List, Optional

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


@dataclass
class ArticleForSynthesis:
    source_name: str
    source_slug: str
    title: str
    summary: str
    url: str


@dataclass
class SourceAnalysis:
    source_slug: str
    source_name: str
    emphasis: str
    omissions: str
    coverage_percentage: float


@dataclass
class SynthesisResult:
    title: str
    synthesis: str
    key_facts: List[str]
    category: str
    source_analyses: List[SourceAnalysis]


SYSTEM_PROMPT = """Sos un periodista neutral y experimentado argentino. Tu misión es analizar la misma noticia
cubierta por distintos medios argentinos y producir un análisis objetivo e imparcial.
Nunca tomás partido político. Tu objetivo es mostrar qué dice cada medio y qué omite,
para que el lector pueda formarse su propia opinión informada."""

USER_PROMPT_TEMPLATE = """Analizá las siguientes notas periodísticas sobre el mismo hecho, publicadas por distintos medios argentinos:

{articles}

Producí un análisis completo en formato JSON con esta estructura exacta:
{{
  "title": "Título neutral y descriptivo del hecho (máx 100 caracteres)",
  "synthesis": "Síntesis neutral del hecho redactada como artículo periodístico real, de 500-700 palabras. Comenzá con un párrafo inicial impactante (lead) que responda quién, qué, cuándo, dónde y por qué. Continuá con párrafos separados por dos saltos de línea (\\n\\n) que desarrollen el contexto, las declaraciones relevantes si las hay, y un cierre que explique las consecuencias o estado actual. Solo hechos verificables, sin opinión. En castellano argentino.",
  "key_facts": ["Hecho clave 1", "Hecho clave 2", "Hecho clave 3", "Hecho clave 4", "Hecho clave 5"],
  "category": "Una de: Política, Economía, Sociedad, Seguridad, Internacional, Deportes, Cultura, Tecnología, Ambiente",
  "source_analyses": [
    {{
      "source_slug": "slug del medio",
      "emphasis": "Qué aspectos, ángulos o datos enfatiza este medio. Incluí el tono editorial, a quién le dan voz, qué términos usa y qué perspectiva política o ideológica refleja su cobertura. 3-4 oraciones con sustancia.",
      "omissions": "Qué datos, voces o contexto relevante omite o minimiza este medio en comparación con los demás. Sé específico: qué fuentes no consultó, qué hechos no menciona, qué contexto histórico o económico ignoró. 3-4 oraciones. Si la cobertura es genuinamente completa, escribí 'Sin omisiones destacadas.'"
    }}
  ]
}}

Respondé SOLO con el JSON, sin texto adicional ni bloques de código."""


def _format_articles(articles: List[ArticleForSynthesis]) -> str:
    lines = []
    for i, art in enumerate(articles, 1):
        lines.append(f"[{i}] {art.source_name.upper()}")
        lines.append(f"Título: {art.title}")
        if art.summary:
            lines.append(f"Resumen: {art.summary}")
        lines.append("")
    return "\n".join(lines)


def _parse_response(raw: str, articles: List[ArticleForSynthesis]) -> Optional[SynthesisResult]:
    raw = raw.strip()
    # Strip markdown code blocks if model wraps in them
    if raw.startswith("```"):
        parts = raw.split("```")
        raw = parts[1] if len(parts) > 1 else raw
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip()

    data = json.loads(raw)

    all_slugs = {a.source_slug: a.source_name for a in articles}
    n_sources = len(all_slugs)

    source_analyses = []
    for sa_data in data.get("source_analyses", []):
        slug = sa_data.get("source_slug", "")
        source_analyses.append(SourceAnalysis(
            source_slug=slug,
            source_name=all_slugs.get(slug, slug),
            emphasis=sa_data.get("emphasis", ""),
            omissions=sa_data.get("omissions", ""),
            coverage_percentage=round(100.0 / n_sources, 1),
        ))

    return SynthesisResult(
        title=data["title"],
        synthesis=data["synthesis"],
        key_facts=data.get("key_facts", []),
        category=data.get("category", "Política"),
        source_analyses=source_analyses,
    )


async def _call_groq(prompt: str) -> str:
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}"},
            json={
                "model": settings.GROQ_MODEL,
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ],
                "temperature": 0.3,
            },
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"]


async def _call_ollama(prompt: str) -> str:
    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(
            f"{settings.OLLAMA_URL}/api/chat",
            json={
                "model": settings.OLLAMA_MODEL,
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ],
                "stream": False,
                "options": {"temperature": 0.3},
            },
        )
        resp.raise_for_status()
        return resp.json()["message"]["content"]


async def classify_comments(comments: list) -> dict:
    """
    Single Groq call. Takes all scraped comments as one array (with text + source_name).
    Returns {"positive": [indices], "negative": [indices]} — 3 of each max.
    """
    if not comments or settings.AI_PROVIDER not in ("groq", "ollama"):
        return {"positive": [], "negative": []}

    numbered = "\n".join(
        f"{i+1}. [{c.get('source_name','Lector')}] {c.get('text','')}"
        for i, c in enumerate(comments[:30])
    )
    prompt = f"""Tenés estos comentarios de lectores argentinos sobre una misma noticia, provenientes de distintos medios.

{numbered}

Seleccioná exactamente 3 comentarios con perspectiva FAVORABLE/positiva sobre el tema y 3 con perspectiva CRÍTICA/negativa. Priorizá los más sustanciales e interesantes (no los más cortos ni los más agresivos). No repitas índices entre positivos y negativos.

Respondé SOLO con JSON válido:
{{"positive": [1, 2, 3], "negative": [4, 5, 6]}}

Los números son los índices (empezando en 1). Si hay menos de 3 de algún tipo, devolvé los que haya."""

    try:
        if settings.AI_PROVIDER == "ollama":
            raw = await _call_ollama(prompt)
        else:
            raw = await _call_groq(prompt)
        raw = raw.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        return json.loads(raw.strip())
    except Exception:
        return {"positive": [], "negative": []}


async def synthesize_cluster(articles: List[ArticleForSynthesis]) -> Optional[SynthesisResult]:
    if len(articles) < 2:
        return None

    prompt = USER_PROMPT_TEMPLATE.format(articles=_format_articles(articles))

    try:
        if settings.AI_PROVIDER == "ollama":
            raw = await _call_ollama(prompt)
        else:
            raw = await _call_groq(prompt)

        return _parse_response(raw, articles)

    except json.JSONDecodeError as e:
        logger.error(f"JSON parse error in AI synthesis: {e}")
        return None
    except Exception as e:
        logger.error(f"AI synthesis error ({settings.AI_PROVIDER}): {e}")
        return None
