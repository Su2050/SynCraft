#!/usr/bin/env python3
# parse_test_report.py
import json
import sys
from datetime import datetime

def generate_failed_tests_report(json_file, output_file):
    """生成失败测试报告"""
    try:
        with open(json_file, 'r') as f:
            data = json.load(f)
        
        with open(output_file, 'w') as f:
            f.write("# SynCraft 失败测试报告\n\n")
            f.write(f"生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
            
            # 提取失败的测试
            failed_tests = [test for test in data.get('tests', []) if test.get('outcome') == 'failed']
            
            if not failed_tests:
                f.write("## 所有测试通过\n")
            else:
                f.write(f"## 失败的测试 ({len(failed_tests)})\n\n")
                
                # 按测试类型分类
                service_tests = []
                api_tests = []
                other_tests = []
                
                for test in failed_tests:
                    nodeid = test.get('nodeid', '')
                    if 'test_api_' in nodeid:
                        api_tests.append(test)
                    elif 'test_' in nodeid and '_service' in nodeid:
                        service_tests.append(test)
                    else:
                        other_tests.append(test)
                
                # 添加测试摘要
                f.write("### 测试摘要\n\n")
                f.write(f"- 服务层测试失败: {len(service_tests)}\n")
                f.write(f"- API测试失败: {len(api_tests)}\n")
                f.write(f"- 其他测试失败: {len(other_tests)}\n\n")
                
                # 处理服务层测试
                if service_tests:
                    f.write("### 服务层测试\n\n")
                    for i, test in enumerate(service_tests, 1):
                        write_test_details(f, test, i)
                
                # 处理API测试
                if api_tests:
                    f.write("### API测试\n\n")
                    for i, test in enumerate(api_tests, 1):
                        write_test_details(f, test, i)
                
                # 处理其他测试
                if other_tests:
                    f.write("### 其他测试\n\n")
                    for i, test in enumerate(other_tests, 1):
                        write_test_details(f, test, i)
        
        print(f"失败测试报告已生成: {output_file}")
        return True
    except Exception as e:
        print(f"生成失败测试报告时出错: {e}")
        return False

def write_test_details(f, test, index):
    """写入测试详情"""
    nodeid = test.get('nodeid', '')
    name = nodeid.split('::')[-1] if '::' in nodeid else nodeid
    file = nodeid.split('::')[0] if '::' in nodeid else ''
    message = test.get('call', {}).get('longrepr', '')
    
    f.write(f"#### {index}. {name}\n\n")
    f.write(f"- **文件**: {file}\n")
    f.write("- **失败原因**:\n\n")
    f.write("```\n")
    f.write(message)
    f.write("\n```\n\n")

if __name__ == '__main__':
    if len(sys.argv) != 3:
        print("用法: python parse_test_report.py <json_file> <output_file>")
        sys.exit(1)
    
    json_file = sys.argv[1]
    output_file = sys.argv[2]
    
    if not generate_failed_tests_report(json_file, output_file):
        sys.exit(1)
