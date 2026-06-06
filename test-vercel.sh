#!/bin/bash
echo "🔍 测试 Vercel 部署状态"
echo "========================"
echo ""

DOMAIN="wctgrzpj.cn"

echo "1. 测试健康检查 API..."
curl -s "https://$DOMAIN/api/health" 2>&1
echo ""
echo ""

echo "2. 测试情绪回应 API..."
curl -s -X POST "https://$DOMAIN/api/respond" \
  -H "Content-Type: application/json" \
  -d '{"mood":"good","time":"14:30","weather":"","count":1}' 2>&1
echo ""
echo ""

echo "3. 检查网站主页..."
curl -s -I "https://$DOMAIN" 2>&1 | head -5
echo ""

echo "========================"
echo "✅ 测试完成"
