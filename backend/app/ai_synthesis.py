import json
import logging
from dataclasses import dataclass
from typing import List, Optional

import httpx
import anthropic

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
      "emphasis": "Qué aspectos enfatiza o resalta este medio (1-2 oraciones)",
      "omissions": "Qué datos relevantes omite o minimiza este medio comparado con los demás (1-2 oraciones). Si no omite nada relevante, escribí 'Sin omisiones destacadas.'"
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


def _call_anthropic(prompt: str) -> str:
    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2048,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text


async def synthesize_cluster(articles: List[ArticleForSynthesis]) -> Optional[SynthesisResult]:
    if len(articles) < 2:
        return None

    prompt = USER_PROMPT_TEMPLATE.format(articles=_format_articles(articles))

    try:
        if settings.AI_PROVIDER == "groq":
            raw = await _call_groq(prompt)
        elif settings.AI_PROVIDER == "ollama":
            raw = await _call_ollama(prompt)
        else:
            raw = _call_anthropic(prompt)

        return _parse_response(raw, articles)

    except json.JSONDecodeError as e:
        logger.error(f"JSON parse error in AI synthesis: {e}")
        return None
    except Exception as e:
        logger.error(f"AI synthesis error ({settings.AI_PROVIDER}): {e}")
        return None
