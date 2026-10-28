#!/bin/bash
# dsh-prompt-predict 升级到 npm latest（macOS / Linux）
#
#   bash scripts/update.sh                # 升级默认 profile：desktop
#   bash scripts/update.sh web            # 按名字指定 profile
#   bash scripts/update.sh <profile 目录>  # 或直接给 profile 路径
#
# 与 install.sh 不同：这里不打包本仓库，直接装 registry 上的最新版，
# pnpm add 会同时收敛依赖声明（package.json）与 lock（pnpm-lock.yaml）。
set -euo pipefail

PROFILE="${1:-desktop}"
case "$PROFILE" in
  /*) PROFILE_DIR="$PROFILE" ;;
  *)  PROFILE_DIR="$HOME/.dsh/profiles/$PROFILE" ;;
esac

say(){ printf '%s\n' "$*"; }
fail(){ printf '错误：%s\n' "$*" >&2; exit 1; }

[ -d "$PROFILE_DIR" ] || fail "找不到 DSH profile：$PROFILE_DIR（先启动过一次 DeepSeek Harness，或检查 profile 名字）"

# App 运行中升级会改写正在使用的 node_modules：pnpm 可能卡住或留下半装状态（实测）。
# 因此先探测主进程（排除 --type= 的 renderer/gpu 等辅助进程），在跑就直接报错退出。
APP_MAIN="/Applications/DeepSeek Harness.app/Contents/MacOS/DeepSeek Harness"
app_running=0
while IFS= read -r line; do
  case "$line" in
    *"$APP_MAIN"*)
      case "$line" in
        *"--type="*) ;;                 # 辅助进程，忽略
        *) app_running=1 ;;
      esac ;;
  esac
done < <(ps -axo args= 2>/dev/null)
if [ "$app_running" -eq 1 ]; then
  fail "检测到 DeepSeek Harness 正在运行。请先完全退出 App（Cmd+Q）再执行升级，否则可能卡住或留下半装状态"
fi

# 优先用 DSH 自带的 node / pnpm，找不到再退回 PATH（与 install.sh 一致）
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

BEFORE="$("$NODE_BIN" -e "try{console.log(require('$PROFILE_DIR/node_modules/dsh-prompt-predict/package.json').version)}catch(e){console.log('(未安装)')}" 2>/dev/null || echo '(未安装)')"

say "profile：$PROFILE_DIR"
say "当前版本：$BEFORE"
say "正在从 npm 安装最新版…"
cd "$PROFILE_DIR"
# minimumReleaseAge=0：当天刚发布的版本也会被供应链闸门拦，升级必须显式放行
run_pnpm add dsh-prompt-predict@latest --config.minimumReleaseAge=0 >/dev/null 2>&1 \
  || run_pnpm add dsh-prompt-predict@latest --config.minimumReleaseAge=0 \
  || fail "pnpm add 失败"

DST="$PROFILE_DIR/node_modules/dsh-prompt-predict"
[ -d "$DST" ] || fail "升级后找不到 $DST"

# 兜底接线：profile 被手动改过的话，bundles 可能缺
"$NODE_BIN" - "$PROFILE_DIR/package.json" <<'NODE'
const fs=require('node:fs');const file=process.argv[2];
const pkg=JSON.parse(fs.readFileSync(file,'utf8'));
pkg.dsh=pkg.dsh||{};pkg.dsh.profile=pkg.dsh.profile||{};pkg.dsh.profile.bundles=pkg.dsh.profile.bundles||[];
if(!pkg.dsh.profile.bundles.includes('dsh-prompt-predict')){pkg.dsh.profile.bundles.push('dsh-prompt-predict');fs.writeFileSync(file,JSON.stringify(pkg,null,2)+'\n');console.log('已接线 bundles: dsh-prompt-predict');}
NODE

AFTER="$("$NODE_BIN" -e "console.log(require('$DST/package.json').version)" 2>/dev/null || echo '?')"
say ""
say "✅ 升级完成：$BEFORE → $AFTER"
say "依赖声明与 lock 已收敛到 $AFTER；Host 改动重启 App 生效，客户端改动刷新窗口生效。"
