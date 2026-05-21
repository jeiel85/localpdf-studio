# Snap 패키지 제출 가이드

[snapcraft.io/store](https://snapcraft.io/store)에 등록되면 사용자가:

```bash
sudo snap install localpdf-studio
sudo snap refresh localpdf-studio
```

## 제출 절차

### 1. snapcraft 설치 (Ubuntu 22.04+)

```bash
sudo snap install snapcraft --classic
sudo snap install multipass     # snapcraft가 사용하는 VM 빌더
```

### 2. 이름 예약 (1회)

```bash
snapcraft register localpdf-studio
```

소유 확인 후 Snapcraft Store에 등록됨.

### 3. 자동화 스크립트로 빌드 + 업로드

저장소 루트에서:

```bash
# 빌드만 수행
bash scripts/linux/publish-snap.sh

# 이름 예약 + 빌드 + stable 업로드
bash scripts/linux/publish-snap.sh --register --upload

# 이미 이름을 예약했다면 stable 업로드만
bash scripts/linux/publish-snap.sh --upload
```

스크립트는 `packaging/snap/snapcraft.yaml`의 `name`/`version`을 읽어 산출물 파일을 찾고,
`--upload`를 지정한 경우 `snapcraft upload --release=stable`까지 실행한다.

### 4. 수동 빌드 + 업로드

```bash
cd packaging/snap

# 빌드 (multipass VM에서 실행, 5-10분 소요)
snapcraft

# 결과: localpdf-studio_<버전>_amd64.snap

# 로그인 (1회)
snapcraft login

# stable 채널에 push + release
snapcraft upload --release=stable localpdf-studio_<버전>_amd64.snap
```

### 5. 자동화 (GitHub Actions)

```yaml
- uses: snapcore/action-build@v1
  id: snapcraft
- uses: snapcore/action-publish@v1
  env:
    SNAPCRAFT_STORE_CREDENTIALS: ${{ secrets.SNAPCRAFT_TOKEN }}
  with:
    snap: ${{ steps.snapcraft.outputs.snap }}
    release: stable
```

`SNAPCRAFT_TOKEN`은 `snapcraft export-login`으로 발급.

## 검수

Snap Store는 **자동 보안 스캔만** 거치고 사람 리뷰가 없어서 (1차 등록 외에는)
대부분 **수 분 ~ 1시간 내** 게시됩니다. 가장 빠른 Linux 배포 채널.
