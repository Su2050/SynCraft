# SynCraft 测试覆盖率报告

生成时间: Tue May  6 17:37:10 CST 2025

## 总体覆盖率: 80%

## 模块覆盖率详情

| 模块 | 语句数 | 缺失 | 覆盖率 |
| ---- | ------ | ---- | ------ |
| SynCraft/backend/app/testAPI/test_api_qa_pairs.py | ..................... | [ | 22%] |
| SynCraft/backend/app/testAPI/test_api_sessions.py | ....... | [ | 30%] |
| SynCraft/backend/app/testAPI/test_context_service.py | ................... | [ | 50%] |
| .. | [ | 52%] | 52%] |
| SynCraft/backend/app/testAPI/test_node_service.py | ............... | [ | 68%] |
| SynCraft/backend/app/testAPI/test_qa_pair_service.py | ................... | [ | 89%] |
| .... | [ | 93%] | 93%] |
| SynCraft/backend/app/testAPI/test_session_service.py | ...... | [100%] | [100%] |
| SynCraft/backend/app/__init__.py | 5 | 0 | 100% |
| SynCraft/backend/app/api/__init__.py | 16 | 0 | 100% |
| SynCraft/backend/app/api/context_nodes.py | 120 | 64 | 47% |
| SynCraft/backend/app/api/contexts.py | 121 | 67 | 45% |
| SynCraft/backend/app/api/llm.py | 19 | 5 | 74% |
| SynCraft/backend/app/api/nodes.py | 211 | 134 | 36% |
| SynCraft/backend/app/api/qa_pairs.py | 206 | 30 | 85% |
| SynCraft/backend/app/api/search.py | 57 | 31 | 46% |
| SynCraft/backend/app/api/sessions.py | 219 | 72 | 67% |
| SynCraft/backend/app/cache/__init__.py | 0 | 0 | 100% |
| SynCraft/backend/app/cache/cache_manager.py | 71 | 19 | 73% |
| SynCraft/backend/app/database/__init__.py | 1 | 0 | 100% |
| SynCraft/backend/app/database/database.py | 7 | 0 | 100% |
| SynCraft/backend/app/di/__init__.py | 0 | 0 | 100% |
| SynCraft/backend/app/di/container.py | 44 | 6 | 86% |
| SynCraft/backend/app/main.py | 21 | 3 | 86% |
| SynCraft/backend/app/models/__init__.py | 7 | 0 | 100% |
| SynCraft/backend/app/models/context.py | 13 | 0 | 100% |
| SynCraft/backend/app/models/context_node.py | 26 | 5 | 81% |
| SynCraft/backend/app/models/edge.py | 9 | 0 | 100% |
| SynCraft/backend/app/models/message.py | 11 | 0 | 100% |
| SynCraft/backend/app/models/node.py | 13 | 0 | 100% |
| SynCraft/backend/app/models/qapair.py | 16 | 0 | 100% |
| SynCraft/backend/app/models/session.py | 10 | 0 | 100% |
| SynCraft/backend/app/services/__init__.py | 5 | 0 | 100% |
| SynCraft/backend/app/services/context_service.py | 123 | 7 | 94% |
| SynCraft/backend/app/services/llm/__init__.py | 2 | 0 | 100% |
| SynCraft/backend/app/services/llm/llm_factory.py | 17 | 2 | 88% |
| SynCraft/backend/app/services/llm/llm_interface.py | 9 | 2 | 78% |
| SynCraft/backend/app/services/llm/mock_llm_service.py | 11 | 3 | 73% |
| SynCraft/backend/app/services/llm/real_llm_service.py | 73 | 62 | 15% |
| SynCraft/backend/app/services/node_service.py | 110 | 3 | 97% |
| SynCraft/backend/app/services/qa_pair_service.py | 167 | 30 | 82% |
| SynCraft/backend/app/services/session_service.py | 89 | 7 | 92% |
| SynCraft/backend/app/testAPI/__init__.py | 0 | 0 | 100% |
| SynCraft/backend/app/testAPI/conftest.py | 75 | 0 | 100% |
| SynCraft/backend/app/testAPI/test_api_qa_pairs.py | 194 | 0 | 100% |
| SynCraft/backend/app/testAPI/test_api_sessions.py | 68 | 0 | 100% |
| SynCraft/backend/app/testAPI/test_context_service.py | 182 | 0 | 100% |
| SynCraft/backend/app/testAPI/test_node_service.py | 146 | 0 | 100% |
| SynCraft/backend/app/testAPI/test_qa_pair_service.py | 215 | 0 | 100% |
| SynCraft/backend/app/testAPI/test_session_service.py | 61 | 0 | 100% |
| SynCraft/backend/app/utils/__init__.py | 2 | 0 | 100% |
| SynCraft/backend/app/utils/ner.py | 9 | 3 | 67% |
| SynCraft/backend/app/utils/prompt.py | 5 | 1 | 80% |

## 低覆盖率模块 (<50%)

| 模块 | 覆盖率 |
| ---- | ------ |
| SynCraft/backend/app/api/context_nodes.py | 47% |
| SynCraft/backend/app/api/contexts.py | 45% |
| SynCraft/backend/app/api/nodes.py | 36% |
| SynCraft/backend/app/api/search.py | 46% |
| SynCraft/backend/app/services/llm/real_llm_service.py | 15% |

## 测试结果摘要

collecting ... collected 93 items
