# Homebrew Cask 제출 가이드

이 디렉터리는 LocalPDF Studio의 Homebrew Cask 정의입니다.

## 두 가지 경로

### 옵션 A: Personal Tap (즉시, 권장)

Homebrew 공식 cask 저장소(`homebrew/cask`)는 **공증된(notarized) macOS 앱만** 받습니다.
무서명 앱은 거부됩니다 (정책상). 그래서 첫 단계로는 **개인 tap**을 운영:

```bash
# 1. GitHub에 homebrew-tap 리포 생성
#    https://github.com/jeiel85/homebrew-tap

# 2. 다음 구조로 푸시
#    homebrew-tap/
#      └── Casks/
#          └── localpdf-studio.rb   # 이 파일 복사

# 3. 사용자는 다음 명령으로 설치
brew tap jeiel85/tap
brew install --cask localpdf-studio
brew upgrade --cask localpdf-studio
```

장점: 비용 0원, 즉시 가능, 자체 운영.
단점: 사용자가 tap을 추가하는 한 단계 필요 + 공증되지 않은 dmg 안내.

### 옵션 B: 공식 homebrew/cask 제출 (공증 후)

Apple Developer 가입 + 공증 자동화 추가 후 가능:

1. [homebrew/cask](https://github.com/Homebrew/homebrew-cask) fork
2. `Casks/l/localpdf-studio.rb` 경로에 이 파일 복사
3. `brew style --fix --cask localpdf-studio` 통과
4. `brew audit --new-cask localpdf-studio` 통과
5. PR 제목: `localpdf-studio 0.10.0 (new cask)`
6. 모더레이터 리뷰 (보통 며칠 ~ 2주)

## SHA-256 계산

```bash
shasum -a 256 ~/Downloads/LocalPDF\ Studio_0.10.0_universal.dmg
```

값을 `localpdf-studio.rb`의 `sha256 "..."` 에 입력.

## 자동 livecheck

위 cask는 `livecheck do strategy :github_latest end`로 GitHub Release 최신 태그를 자동 감지.
`brew bump-cask-pr localpdf-studio` 명령으로 새 버전 자동 PR 생성 가능.
