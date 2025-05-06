#!/bin/bash

# 设置颜色
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印标题
echo -e "${BLUE}=======================================${NC}"
echo -e "${BLUE}   SynCraft 测试运行脚本 (带MD报告)   ${NC}"
echo -e "${BLUE}=======================================${NC}"

# 检查依赖
echo -e "\n${YELLOW}检查测试依赖...${NC}"
pip install pytest pytest-cov pytest-md pytest-json-report httpx python-dotenv > /dev/null 2>&1
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

# 运行所有测试并生成各种报告
echo -e "\n${YELLOW}运行所有测试并生成报告...${NC}"
pytest ${TEST_PATH} -v \
    --cov=SynCraft/backend/app \
    --cov-report=html:test_reports/coverage \
    --cov-report=term \
    --md=test_reports/test_results.md \
    --json-report \
    --json-report-file=test_reports/report.json

# 生成失败测试报告
echo -e "\n${YELLOW}生成失败测试报告...${NC}"

# 检查是否有JSON报告
if [ -f "test_reports/report.json" ]; then
    # 使用Python脚本解析JSON报告
    python SynCraft/backend/parse_test_report.py test_reports/report.json test_reports/failed_tests.md
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}失败测试报告生成成功!${NC}"
    else
        echo -e "${RED}失败测试报告生成失败!${NC}"
    fi
else
    # 创建失败测试报告的Markdown文件
    FAILED_MD="test_reports/failed_tests.md"
    echo "# SynCraft 失败测试报告" > ${FAILED_MD}
    echo "" >> ${FAILED_MD}
    echo "生成时间: $(date)" >> ${FAILED_MD}
    echo "" >> ${FAILED_MD}
    echo "## 无测试报告" >> ${FAILED_MD}
    echo "" >> ${FAILED_MD}
    echo "未找到JSON测试报告。" >> ${FAILED_MD}
fi

# 生成Markdown覆盖率报告
echo -e "\n${YELLOW}生成Markdown覆盖率报告...${NC}"

# 创建覆盖率报告的Markdown文件
COVERAGE_MD="test_reports/coverage_report.md"
echo "# SynCraft 测试覆盖率报告" > ${COVERAGE_MD}
echo "" >> ${COVERAGE_MD}
echo "生成时间: $(date)" >> ${COVERAGE_MD}
echo "" >> ${COVERAGE_MD}

# 运行覆盖率并提取数据
coverage_output=$(pytest ${TEST_PATH} --cov=SynCraft/backend/app --cov-report=term)

# 提取总体覆盖率
total_coverage=$(echo "$coverage_output" | grep "TOTAL" | awk '{print $NF}')
echo "## 总体覆盖率: ${total_coverage}" >> ${COVERAGE_MD}
echo "" >> ${COVERAGE_MD}

# 添加表头
echo "## 模块覆盖率详情" >> ${COVERAGE_MD}
echo "" >> ${COVERAGE_MD}
echo "| 模块 | 语句数 | 缺失 | 覆盖率 |" >> ${COVERAGE_MD}
echo "| ---- | ------ | ---- | ------ |" >> ${COVERAGE_MD}

# 提取每个模块的覆盖率并添加到Markdown
echo "$coverage_output" | grep -v "TOTAL" | grep "%" | while read -r line; do
    module=$(echo "$line" | awk '{print $1}')
    statements=$(echo "$line" | awk '{print $2}')
    missing=$(echo "$line" | awk '{print $3}')
    coverage=$(echo "$line" | awk '{print $NF}')
    
    echo "| $module | $statements | $missing | $coverage |" >> ${COVERAGE_MD}
done

echo "" >> ${COVERAGE_MD}
echo "## 低覆盖率模块 (<50%)" >> ${COVERAGE_MD}
echo "" >> ${COVERAGE_MD}
echo "| 模块 | 覆盖率 |" >> ${COVERAGE_MD}
echo "| ---- | ------ |" >> ${COVERAGE_MD}

# 提取覆盖率低于50%的模块
echo "$coverage_output" | grep -v "TOTAL" | grep "%" | while read -r line; do
    module=$(echo "$line" | awk '{print $1}')
    coverage=$(echo "$line" | awk '{print $NF}' | tr -d '%')
    
    if (( $(echo "$coverage < 50" | bc -l) )); then
        echo "| $module | $coverage% |" >> ${COVERAGE_MD}
    fi
done

# 添加测试结果摘要
echo "" >> ${COVERAGE_MD}
echo "## 测试结果摘要" >> ${COVERAGE_MD}
echo "" >> ${COVERAGE_MD}

test_summary=$(pytest ${TEST_PATH} -v | grep "collected")
echo "$test_summary" >> ${COVERAGE_MD}

# 打印测试报告路径
echo -e "\n${GREEN}测试完成!${NC}"
echo -e "${YELLOW}HTML测试覆盖率报告: ${NC}test_reports/coverage/index.html"
echo -e "${YELLOW}Markdown测试报告: ${NC}test_reports/test_results.md"
echo -e "${YELLOW}Markdown覆盖率报告: ${NC}test_reports/coverage_report.md"
echo -e "${YELLOW}失败测试报告: ${NC}test_reports/failed_tests.md"

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
