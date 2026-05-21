#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
PKGBUILD_SRC="$REPO_ROOT/packaging/aur/PKGBUILD"

PACKAGE_NAME="localpdf-studio-bin"
WORK_DIR="${TMPDIR:-/tmp}/localpdf-studio-aur"
PUSH=0
SKIP_BUILD=0
FORCE_CLEAN=0
COMMIT_MESSAGE=""

usage() {
  cat <<'USAGE'
Usage: scripts/linux/publish-aur.sh [options]

Validate and optionally publish the LocalPDF Studio AUR package.
By default this script validates locally and prepares a commit, but does not push.

Options:
  --push             Push the prepared commit to AUR.
  --skip-build       Skip makepkg -si local install/build validation.
  --force-clean      Remove an existing work directory before cloning.
  --work-dir PATH    Working directory for the AUR clone. Default: /tmp/localpdf-studio-aur.
  -m, --message MSG  Commit message. Default: Update localpdf-studio-bin to <pkgver>
  -h, --help         Show this help.

Examples:
  bash scripts/linux/publish-aur.sh
  bash scripts/linux/publish-aur.sh --push
  bash scripts/linux/publish-aur.sh --skip-build --push
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --push)
      PUSH=1
      shift
      ;;
    --skip-build)
      SKIP_BUILD=1
      shift
      ;;
    --force-clean)
      FORCE_CLEAN=1
      shift
      ;;
    --work-dir)
      WORK_DIR="${2:?Missing work directory}"
      shift 2
      ;;
    -m|--message)
      COMMIT_MESSAGE="${2:?Missing commit message}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      exit 2
      ;;
  esac
done

if [[ ! -f "$PKGBUILD_SRC" ]]; then
  echo "PKGBUILD not found: $PKGBUILD_SRC" >&2
  exit 1
fi

for tool in git makepkg ssh; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "$tool is required. Run this on Arch Linux with base-devel installed." >&2
    exit 1
  fi
done

PKGVER="$(awk -F= '$1 == "pkgver" { print $2; exit }' "$PKGBUILD_SRC")"
if [[ -z "$PKGVER" ]]; then
  echo "Could not read pkgver from $PKGBUILD_SRC" >&2
  exit 1
fi

if [[ -z "$COMMIT_MESSAGE" ]]; then
  COMMIT_MESSAGE="Update ${PACKAGE_NAME} to ${PKGVER}"
fi

echo "Checking AUR SSH access..."
ssh -T aur@aur.archlinux.org help >/dev/null

if [[ -e "$WORK_DIR" ]]; then
  if [[ "$FORCE_CLEAN" -eq 1 ]]; then
    rm -rf "$WORK_DIR"
  else
    echo "Work directory already exists: $WORK_DIR" >&2
    echo "Remove it manually, choose --work-dir, or re-run with --force-clean." >&2
    exit 1
  fi
fi

git clone "ssh://aur@aur.archlinux.org/${PACKAGE_NAME}.git" "$WORK_DIR"

cp "$PKGBUILD_SRC" "$WORK_DIR/PKGBUILD"
pushd "$WORK_DIR" >/dev/null

makepkg --printsrcinfo > .SRCINFO

if [[ "$SKIP_BUILD" -eq 0 ]]; then
  makepkg -si
fi

git add PKGBUILD .SRCINFO

if git diff --cached --quiet; then
  echo "No AUR changes to commit."
else
  git commit -m "$COMMIT_MESSAGE"
fi

if [[ "$PUSH" -eq 1 ]]; then
  git push origin master
  echo "Published to https://aur.archlinux.org/packages/${PACKAGE_NAME}"
else
  echo "Push skipped. Review $WORK_DIR, then re-run with --push when ready."
fi

popd >/dev/null
