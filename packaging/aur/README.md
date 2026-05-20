# AUR (Arch User Repository) 제출 가이드

[AUR](https://aur.archlinux.org/)에 등록되면 Arch/Manjaro 사용자가:

```bash
# yay
yay -S localpdf-studio-bin

# paru
paru -S localpdf-studio-bin
```

## 첫 제출 절차

### 1. AUR 계정 생성 + SSH 키 등록

[aur.archlinux.org/register](https://aur.archlinux.org/register) — 무료.

`~/.ssh/aur` 키페어 생성 + 공개키를 계정 My Account 페이지에 등록.

`~/.ssh/config`:
```
Host aur.archlinux.org
  IdentityFile ~/.ssh/aur
  User aur
```

### 2. 패키지 검증 + sums 갱신

```bash
# pacman-contrib 패키지 필요
cd packaging/aur

# SHA-256 자동 계산
updpkgsums

# .SRCINFO 생성
makepkg --printsrcinfo > .SRCINFO

# 로컬 빌드 테스트
makepkg -si
```

### 3. AUR 리포지토리에 푸시

```bash
# AUR 리포 clone (빈 저장소)
git clone ssh://aur@aur.archlinux.org/localpdf-studio-bin.git aur-localpdf-studio-bin

# PKGBUILD + .SRCINFO 복사
cp PKGBUILD .SRCINFO aur-localpdf-studio-bin/

# 커밋 + 푸시
cd aur-localpdf-studio-bin
git add PKGBUILD .SRCINFO
git commit -m "Initial commit: localpdf-studio-bin <버전>"
git push origin master
```

게시 즉시 검색 가능 (검수 없음).

## 새 버전 업데이트

```bash
# PKGBUILD의 pkgver, pkgrel 갱신 후
updpkgsums
makepkg --printsrcinfo > .SRCINFO
git add PKGBUILD .SRCINFO
git commit -m "Update to 0.11.0"
git push
```

## 자동화 (GitHub Actions)

```yaml
- uses: KSXGitHub/github-actions-deploy-aur@v2.7.0
  with:
    pkgname: localpdf-studio-bin
    pkgbuild: packaging/aur/PKGBUILD
    commit_username: jeiel85
    commit_email: jeiel85@gmail.com
    ssh_private_key: ${{ secrets.AUR_SSH_KEY }}
    commit_message: "Update to ${{ github.ref_name }}"
```

`AUR_SSH_KEY` Secret 등록 (위 1단계의 비공개키).

## 참고

`-bin` 접미사는 미리 빌드된 바이너리 사용을 의미 (소스 빌드는 `localpdf-studio`).
.deb 패키지를 직접 unpacking 하므로 빌드가 매우 빠릅니다 (~10초).
소스 빌드 PKGBUILD가 필요하면 별도 작성.
