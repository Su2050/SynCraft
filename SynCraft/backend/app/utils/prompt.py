# backend/app/utils/prompt.py
"""
Prompt 组装器
根据父节点的信息构建提示词
"""
from app.models.node import Node
from sqlmodel import Session, select
from app.models.qapair import QAPair
from app.models.message import Message
from app.database import get_session

def build_prompt(parent: Node | None, question: str) -> str:
    """
    构建提示词
    
    Args:
        parent: 父节点，可能为None
        question: 当前问题
        
    Returns:
        构建好的提示词
    """
    if not parent:
        return question
    
    # 获取父节点的QA对
    db = next(get_session())
    parent_qa_pairs = []
    
    try:
        # 查询父节点的QA对
        query = select(QAPair).where(QAPair.node_id == parent.id).order_by(QAPair.created_at)
        parent_qa_pairs = db.exec(query).all()
        
        if not parent_qa_pairs:
            # 如果父节点没有QA对，直接返回问题
            return question
        
        # 获取最新的QA对
        latest_qa_pair = parent_qa_pairs[-1]
        
        # 查询QA对的消息
        msg_query = select(Message).where(Message.qa_pair_id == latest_qa_pair.id).order_by(Message.timestamp)
        messages = db.exec(msg_query).all()
        
        # 提取问题和回答
        parent_question = None
        parent_answer = None
        
        for msg in messages:
            if msg.role == "user":
                parent_question = msg.content
            elif msg.role == "assistant":
                parent_answer = msg.content
        
        # 如果没有找到问题或回答，直接返回问题
        if not parent_question or not parent_answer:
            return question
        
        # 构建提示词
        return f"""请在以下上下文基础上回答后续问题。

【之前的问答】
Q: {parent_question}
A: {parent_answer}

【新问题】
{question}
"""
    except Exception as e:
        # 如果出现异常，记录错误并返回原始问题
        print(f"构建提示词时出错: {str(e)}")
        return question
