@echo off
chcp 65001 >nul
echo.
echo ╔══════════════════════════════════════╗
echo ║       测试 Vercel 部署状态           ║
echo ╚══════════════════════════════════════╝
echo.

set DOMAIN=wctgrzpj.cn

echo 1. 测试健康检查 API...
echo.
curl -s "https://%DOMAIN%/api/health"
echo.
echo.

echo 2. 测试情绪回应 API...
echo.
curl -s -X POST "https://%DOMAIN%/api/respond" -H "Content-Type: application/json" -d "{\"mood\":\"good\",\"time\":\"14:30\",\"weather\":\"\",\"count\":1}"
echo.
echo.

echo 3. 检查网站主页状态...
echo.
curl -s -I "https://%DOMAIN%" 2>&1 | findstr "HTTP"
echo.

echo ══════════════════════════════════════
echo 测试完成！
echo.
pause
