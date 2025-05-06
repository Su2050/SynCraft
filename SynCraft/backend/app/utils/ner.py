# backend/app/utils/ner.py
import spacy
from functools import lru_cache
from typing import List, Dict

@lru_cache(maxsize=1)
def _nlp():
    return spacy.load("en_core_web_sm")

def extract_entities(text: str) -> List[Dict]:
    """
    返回形如 [{'text':'OpenAI','label':'ORG'}, …]
    """
    doc = _nlp()(text)
    return [{"text": ent.text, "label": ent.label_} for ent in doc.ents]
