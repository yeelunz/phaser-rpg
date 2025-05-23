@echo off
echo 正在運行戰鬥系統集成測試...
node --require ts-node/register src/test/combatSystemTest.ts
echo.
echo 測試完成！
pause
