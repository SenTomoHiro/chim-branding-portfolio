#!/bin/zsh
set -euo pipefail

ROOT="/Users/chim/Codex开发项目/案例展示网站"
OUT="$ROOT/case-production/illustrator-clean-v1/pdf-artboards"
mkdir -p "$OUT/peach-standee" "$OUT/osmanthus-standee" "$OUT/osmanthus-cupsleeve"

pdftoppm -jpeg -r 72 \
  "$ROOT/case-production/springlai-v3/rendered-assets/桃花桂花艺人/桃花桂花艺人__020__231212-艺人-桃花-包装立牌.jpg" \
  "$OUT/peach-standee/artboard"
pdftoppm -jpeg -r 72 \
  "$ROOT/case-production/springlai-v3/rendered-assets/桃花桂花艺人/桃花桂花艺人__015__231212-艺人-桂花-包装立牌.jpg" \
  "$OUT/osmanthus-standee/artboard"
pdftoppm -jpeg -r 72 \
  "$ROOT/case-production/springlai-v3/rendered-assets/桃花桂花艺人/桃花桂花艺人__018__231212-艺人-桂花-杯套-改3.jpg" \
  "$OUT/osmanthus-cupsleeve/artboard"
