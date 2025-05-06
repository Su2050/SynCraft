#!/bin/bash

# 设置颜色
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印标题
echo -e "${BLUE}=======================================${NC}"
echo -e "${BLUE}       SynCraft 测试运行脚本          ${NC}"
echo -e "${BLUE}=======================================${NC}"

# 检查依赖
echo -e "\n${YELLOW}检查测试依赖...${NC}"
pip install pytest pytest-cov httpx python-dotenv > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}依赖安装成功!${NC}"
else
    echo -e "${RED}依赖安装失败!${NC}"
    exit 1
fi

# 创建测试目录
mkdir -p test_reports

# 设置正确的测试路径
TEST_PATH="SynCraft/backend/app/testAPI"

# 加载环境变量
if [ -f "SynCraft/.env" ]; then
    echo -e "\n${YELLOW}加载环境变量...${NC}"
    export $(grep -v '^#' SynCraft/.env | xargs)
    echo -e "${GREEN}环境变量加载成功!${NC}"
else
    echo -e "\n${RED}找不到 .env 文件!${NC}"
    exit 1
fi

# 设置测试环境变量
export TESTING=true
echo -e "\n${YELLOW}设置测试环境变量: TESTING=true${NC}"
echo -e "${GREEN}将使用模拟LLM服务进行测试${NC}"

# 运行所有测试
echo -e "\n${YELLOW}运行所有测试...${NC}"
pytest ${TEST_PATH} -v

# 生成测试覆盖率报告
echo -e "\n${YELLOW}生成测试覆盖率报告...${NC}"
pytest ${TEST_PATH} --cov=SynCraft/backend/app --cov-report=html:test_reports/coverage

# 运行所有服务层测试
echo -e "\n${YELLOW}运行所有服务层测试...${NC}"
pytest ${TEST_PATH}/test_session_service.py ${TEST_PATH}/test_node_service.py ${TEST_PATH}/test_context_service.py ${TEST_PATH}/test_qa_pair_service.py -v

# 运行所有API测试
echo -e "\n${YELLOW}运行所有API测试...${NC}"
pytest ${TEST_PATH}/test_api_sessions.py ${TEST_PATH}/test_api_qa_pairs.py -v

# 打印测试报告路径
echo -e "\n${GREEN}测试完成!${NC}"
echo -e "${YELLOW}测试覆盖率报告: ${NC}test_reports/coverage/index.html"

# 打开测试覆盖率报告
echo -e "\n${YELLOW}是否打开测试覆盖率报告? (y/n)${NC}"
read -r response
if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        open test_reports/coverage/index.html
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        xdg-open test_reports/coverage/index.html
    elif [[ "$OSTYPE" == "msys" ]]; then
        start test_reports/coverage/index.html
    else
        echo -e "${RED}无法自动打开报告，请手动打开: test_reports/coverage/index.html${NC}"
    fi
fi
