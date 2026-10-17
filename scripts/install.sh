#!/bin/bash
# dsh-prompt-predict 一键安装 / 升级（macOS / Linux）
#
#   bash scripts/install.sh                 # 装进默认 profile ~/.dsh/profiles/desktop
#   bash scripts/install.sh <profile 目录>   # 装进指定 profile
#
# 幂等：可重复运行。脚本会现场打包本仓库、安装进 profile 的 node_modules，并接线 bundles。
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PROFILE="${1:-$HOME/.dsh/profiles/desktop}"

say(){ printf '%s\n' "$*"; }
fail(){ printf '错误：%s\n' "$*" >&2; exit 1; }

[ -f "$REPO_DIR/package.json" ] || fail "找不到 $REPO_DIR/package.json"
[ -d "$PROFILE" ] || fail "找不到 DSH profile：$PROFILE（先启动过一次 DeepSeek Harness，或显式传入 profile 目录）"

# 优先用 DSH 自带的 node / pnpm，找不到再退回 PATH
NODE_BIN=""; PNPM_BIN=""
for runtime in "$HOME"/.dsh/dsh-runtimes/*/dependencies; do
  [ -x "$runtime/node/bin/node" ] || continue
  NODE_BIN="$runtime/node/bin/node"
  [ -f "$runtime/pnpm/bin/pnpm.mjs" ] && PNPM_BIN="$runtime/pnpm/bin/pnpm.mjs"
  break
done
[ -n "$NODE_BIN" ] || NODE_BIN="$(command -v node || true)"
[ -n "$NODE_BIN" ] || fail "找不到 node"
run_pnpm(){ if [ -n "$PNPM_BIN" ]; then "$NODE_BIN" "$PNPM_BIN" "$@"; else pnpm "$@"; fi; }

export npm_config_cache="${TMPDIR:-/tmp}/dsh-npm-cache"; mkdir -p "$npm_config_cache"

# ⚠️ 打包目标必须是 profile 内的**持久**目录，并且用**相对路径** add。
# 早先的版本打到 mktemp 临时目录、再 pnpm add 绝对路径，profile 的 package.json 就会记成
#   "dsh-prompt-predict": "file:/var/folders/…/T/tmp.xxxx/dsh-prompt-predict-0.2.1.tgz"
# 临时目录一清，这个依赖就悬空——之后任何 pnpm install 都会整盘失败（实测 ENOENT，退出码 254）。
PKG_DIR="$PROFILE/local-packages"; mkdir -p "$PKG_DIR"

say "正在打包 $REPO_DIR …"
( cd "$REPO_DIR" && run_pnpm pack --pack-destination "$PKG_DIR" >/dev/null )
TGZ="$(ls -1 "$PKG_DIR"/dsh-prompt-predict-*.tgz 2>/dev/null | sort -V | tail -1 || true)"
[ -n "$TGZ" ] || fail "打包失败：$PKG_DIR 下没有生成 tgz"

# 只保留当前这一个 tarball，别让历史版本越积越多
TGZ_NAME="$(basename "$TGZ")"
find "$PKG_DIR" -maxdepth 1 -name 'dsh-prompt-predict-*.tgz' ! -name "$TGZ_NAME" -delete 2>/dev/null || true

say "安装包：${TGZ_NAME}（持久保存在 ${PKG_DIR}）"
cd "$PROFILE"; say "正在安装…"
run_pnpm remove dsh-prompt-predict >/dev/null 2>&1 || true
run_pnpm add "./local-packages/$TGZ_NAME" >/dev/null 2>&1 \
  || run_pnpm add "./local-packages/$TGZ_NAME" || fail "pnpm add 失败"

DST="$PROFILE/node_modules/dsh-prompt-predict"
[ -d "$DST" ] || fail "安装后找不到 $DST"

"$NODE_BIN" - "$PROFILE/package.json" <<'NODE'
const fs=require('node:fs');const file=process.argv[2];
const pkg=JSON.parse(fs.readFileSync(file,'utf8'));
pkg.dsh=pkg.dsh||{};pkg.dsh.profile=pkg.dsh.profile||{};pkg.dsh.profile.bundles=pkg.dsh.profile.bundles||[];
if(!pkg.dsh.profile.bundles.includes('dsh-prompt-predict')){pkg.dsh.profile.bundles.push('dsh-prompt-predict');fs.writeFileSync(file,JSON.stringify(pkg,null,2)+'\n');console.log('已接线 bundles: dsh-prompt-predict');}
else console.log('bundles 已包含 dsh-prompt-predict');
NODE

# 兜底：安装副本被本机加密软件改写时，用仓库里的明文源覆盖回去
fixed=0
for sub in lib client; do
  [ -d "$REPO_DIR/$sub" ] || continue
  for f in "$REPO_DIR/$sub"/*; do
    rel="$sub/$(basename "$f")"
    if [ -f "$DST/$rel" ] && head -c 4 "$DST/$rel" 2>/dev/null | grep -q 'TSD'; then cp "$f" "$DST/$rel"; fixed=$((fixed+1)); fi
  done
done
[ "$fixed" -gt 0 ] && say "已用仓库明文源覆盖 $fixed 个异常文件"
rest=0
while IFS= read -r f; do head -c 4 "$f" 2>/dev/null | grep -q 'TSD' && rest=$((rest+1)); done < <(find "$DST" -type f \( -name '*.js' -o -name '*.mjs' \) 2>/dev/null)
[ "$rest" -eq 0 ] || say "⚠️ 仍有 $rest 个文件是异常副本"

say ""
say "✅ 安装完成（版本：$("$NODE_BIN" -e "console.log(require('$DST/package.json').version)" 2>/dev/null || echo '?')）"
say "重启 DSH 后生效；设置 → 提示词联想 里可开关、切换模型与思考深度。"
