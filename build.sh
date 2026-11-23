#!/bin/sh
# Собирает папку docs/ (готовый статический сайт) из исходников сайта.
#   sh build.sh                      исходники в /home/claude/site
#   SITE_SRC=/path/to/site sh build.sh
#   ANALYTICS=analytics.html sh build.sh     вставить сниппет аналитики (см. README)
#   NO_VERIFY=1 sh build.sh          без проверки в браузере (быстрее)
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
SRC="${SITE_SRC:-/home/claude/site}"
DOMAIN="${DOMAIN:-dashayastrebova.pro}"
OUT="$HERE/docs"
[ -f "$SRC/index.html" ] || { echo "Нет исходников сайта в $SRC (задайте SITE_SRC)"; exit 1; }
if [ -n "$ANALYTICS" ]; then A="--analytics $ANALYTICS"; else A=""; fi
python3 "$HERE/tools/export_static.py" --src "$SRC" --out "$OUT" --base-url "https://$DOMAIN" $A
rm -f "$OUT/export_report.json"
printf '%s\n' "$DOMAIN" > "$OUT/CNAME"      # GitHub Pages: свой домен
: > "$OUT/.nojekyll"                         # GitHub Pages: отдавать файлы как есть
if [ -z "$NO_VERIFY" ]; then python3 "$HERE/tools/verify_dist.py" "$OUT"; fi
echo "Готово: $OUT ($(du -sh "$OUT" | cut -f1)). Дальше: git add -A && git commit -m 'site update' && git push"
