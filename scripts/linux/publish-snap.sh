#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SNAP_DIR="$REPO_ROOT/packaging/snap"
SNAPCRAFT_YAML="$SNAP_DIR/snapcraft.yaml"

CHANNEL="stable"
REGISTER=0
UPLOAD=0
INSTALL_DEPS=0

usage() {
  cat <<'USAGE'
Usage: scripts/linux/publish-snap.sh [options]

Build and optionally publish the LocalPDF Studio Snap package.

Options:
  --register        Register the snap name before building.
  --upload          Upload the built snap and release it to the channel.
  --channel NAME    Release channel for --upload. Default: stable.
  --install-deps    Install snapcraft with sudo snap install snapcraft --classic.
  -h, --help        Show this help.

Examples:
  bash scripts/linux/publish-snap.sh
  bash scripts/linux/publish-snap.sh --register --upload
  bash scripts/linux/publish-snap.sh --upload --channel candidate
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --register)
      REGISTER=1
      shift
      ;;
    --upload)
      UPLOAD=1
      shift
      ;;
    --channel)
      CHANNEL="${2:?Missing channel}"
      shift 2
      ;;
    --install-deps)
      INSTALL_DEPS=1
      shift
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

if [[ ! -f "$SNAPCRAFT_YAML" ]]; then
  echo "snapcraft.yaml not found: $SNAPCRAFT_YAML" >&2
  exit 1
fi

if [[ "$INSTALL_DEPS" -eq 1 ]]; then
  sudo snap install snapcraft --classic
fi

if ! command -v snapcraft >/dev/null 2>&1; then
  echo "snapcraft is not installed. Run with --install-deps or install it manually." >&2
  exit 1
fi

SNAP_NAME="$(awk -F': *' '$1 == "name" { print $2; exit }' "$SNAPCRAFT_YAML")"
SNAP_VERSION="$(awk -F': *' '$1 == "version" { print $2; exit }' "$SNAPCRAFT_YAML")"

if [[ -z "$SNAP_NAME" || -z "$SNAP_VERSION" ]]; then
  echo "Could not read name/version from $SNAPCRAFT_YAML" >&2
  exit 1
fi

if [[ "$REGISTER" -eq 1 ]]; then
  snapcraft login
  snapcraft register "$SNAP_NAME"
fi

pushd "$SNAP_DIR" >/dev/null
snapcraft

SNAP_FILE="$(find "$SNAP_DIR" -maxdepth 1 -type f -name "${SNAP_NAME}_${SNAP_VERSION}_*.snap" | sort | tail -n 1)"
if [[ -z "$SNAP_FILE" ]]; then
  echo "Snap build finished, but no ${SNAP_NAME}_${SNAP_VERSION}_*.snap file was found." >&2
  exit 1
fi

echo "Built snap: $SNAP_FILE"

if [[ "$UPLOAD" -eq 1 ]]; then
  snapcraft login
  snapcraft upload --release="$CHANNEL" "$SNAP_FILE"
  echo "Uploaded $SNAP_NAME $SNAP_VERSION to $CHANNEL."
else
  echo "Upload skipped. Re-run with --upload when ready."
fi

popd >/dev/null
