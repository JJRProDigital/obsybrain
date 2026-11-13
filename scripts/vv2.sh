#!/usr/bin/env bash
set -u
export PATH=/home/juan_jose/tools/node-v25.9.0-linux-x64/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
cd /mnt/e/pruebas2026/obsybrain
docker rm -f obsy-verify-pg >/dev/null 2>&1
docker run -d --rm --name obsy-verify-pg -e POSTGRES_HOST_AUTH_METHOD=trust -e POSTGRES_USER=brain_admin -p 55432:5432 postgres:17.11-alpine >/dev/null 2>&1 || { echo PG_START_FAIL; exit 3 }
sleep 5
HOSTIP=$(sed -n 's/^nameserver //p' /etc/resolv.conf | head -1)
OBSY_BRAIN_PG_URL="postgres://brain_admin@${HOSTIP}:55432/postgres" bash scripts/verify.sh > /tmp/verify-pg.log 2>&1
code=$?
echo "VERIFY_PG_EXIT=$code"
tail -30 /tmp/verify-pg.log
docker rm -f obsy-verify-pg >/dev/null 2>&1
rm -f /mnt/e/pruebas2026/obsybrain/scripts/vv2.sh
