# Test Report

*Report generated on 06-May-2025 at 17:37:09 by [pytest-md]*

[pytest-md]: https://github.com/hackebrot/pytest-md

## Summary

93 tests ran in 15.16 seconds

- 93 passed

## 93 passed

### SynCraft/backend/app/testAPI/test_api_qa_pairs.py

`test_create_qa_pair` 0.03s

`test_create_qa_pair_without_answer` 0.02s

`test_create_qa_pair_invalid_node` 0.01s

`test_get_qa_pair` 0.01s

`test_get_qa_pair_not_found` 0.01s

`test_update_qa_pair` 0.08s

`test_update_qa_pair_partial` 0.02s

`test_update_qa_pair_not_found` 0.01s

`test_delete_qa_pair` 0.03s

`test_delete_qa_pair_not_found` 0.01s

`test_add_message` 0.02s

`test_add_message_invalid_qa_pair` 0.01s

`test_get_node_qa_pairs` 0.01s

`test_get_node_qa_pairs_empty` 0.01s

`test_increment_view_count` 0.02s

`test_increment_view_count_not_found` 0.01s

`test_ask_question` 0.02s

`test_ask_question_invalid_node` 0.01s

`test_search_qa_pairs` 0.01s

`test_search_qa_pairs_no_results` 0.01s

`test_search_qa_pairs_pagination` 0.11s

### SynCraft/backend/app/testAPI/test_api_sessions.py

`test_create_session` 0.03s

`test_get_sessions` 0.01s

`test_get_session` 0.01s

`test_update_session` 0.02s

`test_delete_session` 0.04s

`test_get_session_tree` 0.01s

`test_get_main_context` 0.01s

### SynCraft/backend/app/testAPI/test_context_service.py

`test_create_context` 0.02s

`test_create_context_invalid_session` 0.00s

`test_create_context_invalid_root_node` 0.00s

`test_get_context` 0.00s

`test_get_context_not_found` 0.00s

`test_get_context_by_context_id` 0.00s

`test_get_context_with_nodes` 0.00s

`test_update_context` 0.01s

`test_update_context_not_found` 0.00s

`test_update_context_invalid_node` 0.00s

`test_delete_context` 0.01s

`test_delete_context_not_found` 0.00s

`test_add_node_to_context` 0.01s

`test_add_node_to_context_invalid_context` 0.00s

`test_add_node_to_context_invalid_node` 0.00s

`test_add_existing_node_to_context` 0.02s

`test_remove_node_from_context` 0.01s

`test_remove_root_node_from_context` 0.00s

`test_remove_node_from_context_not_found` 0.00s

`test_get_context_nodes` 0.01s

`test_get_session_contexts` 0.01s

### SynCarft/backend/app/testAPI/test_node_service.py

`test_create_node` 0.01s

`test_create_node_without_parent` 0.01s

`test_create_node_invalid_session` 0.01s

`test_create_node_invalid_parent` 0.00s

`test_get_node` 0.00s

`test_get_node_not_found` 0.00s

`test_get_node_with_qa` 0.01s

`test_update_node` 0.01s

`test_update_node_not_found` 0.00s

`test_delete_node` 0.02s

`test_delete_node_with_children` 0.02s

`test_delete_node_not_found` 0.00s

`test_get_node_path` 0.00s

`test_get_node_children` 0.00s

`test_get_node_descendants` 0.01s

### SynCraft/backend/app/testAPI/test_qa_pair_service.py

`test_create_qa_pair` 0.02s

`test_create_qa_pair_without_answer` 0.01s

`test_create_qa_pair_invalid_node` 0.00s

`test_get_qa_pair` 0.00s

`test_get_qa_pair_not_found` 0.00s

`test_get_qa_pair_with_messages` 0.00s

`test_get_qa_pair_with_messages_not_found` 0.00s

`test_update_qa_pair` 0.01s

`test_update_qa_pair_partial` 0.01s

`test_update_qa_pair_not_found` 0.00s

`test_delete_qa_pair` 0.01s

`test_delete_qa_pair_not_found` 0.00s

`test_add_message` 0.01s

`test_add_message_invalid_qa_pair` 0.00s

`test_get_node_qa_pairs` 0.00s

`test_get_node_qa_pairs_empty` 0.00s

`test_increment_view_count` 0.01s

`test_increment_view_count_not_found` 0.00s

`test_ask_question` 0.02s

`test_ask_question_invalid_node` 0.00s

`test_search_qa_pairs` 0.00s

`test_search_qa_pairs_no_results` 0.00s

`test_search_qa_pairs_pagination` 0.08s

### SynCarft/backend/app/testAPI/test_session_service.py

`test_create_session` 0.01s

`test_get_sessions` 0.00s

`test_get_session` 0.00s

`test_update_session` 0.01s

`test_delete_session` 0.01s

`test_get_main_context` 0.00s
