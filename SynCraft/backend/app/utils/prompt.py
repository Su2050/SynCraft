# backend/app/utils/prompt.py
"""
占位 Prompt 组装器
真正实现时可把 parent 的 summary / 问题 / 回答拼接成系统 prompt
"""
from app.models.node import Node

def build_prompt(parent: Node | None, question: str) -> str:
    if not parent:
        return question
    return f"""请在以下上下文基础上回答后续问题。

【之前的问答】
Q: {parent.question}
A: {parent.answer}

【新问题】
{question}
"""
