cask "localpdf-studio" do
  version "0.18.0"
  sha256 "45e6f282670a395b5bcfba656e4bce5edbfe4584424a98ed95114da132cbd20b"

  url "https://github.com/jeiel85/localpdf-studio/releases/download/v#{version}/LocalPDF.Studio_#{version}_universal.dmg",
      verified: "github.com/jeiel85/localpdf-studio/"
  name "LocalPDF Studio"
  desc "Local-first desktop PDF viewer and utility suite"
  homepage "https://github.com/jeiel85/localpdf-studio"

  livecheck do
    url :url
    strategy :github_latest
  end

  auto_updates true
  depends_on macos: ">= :catalina"

  app "LocalPDF Studio.app"

  zap trash: [
    "~/Library/Application Support/com.jeiel85.localpdfstudio",
    "~/Library/Preferences/com.jeiel85.localpdfstudio.plist",
    "~/Library/Saved Application State/com.jeiel85.localpdfstudio.savedState",
    "~/Library/Logs/LocalPDF Studio",
  ]

  caveats <<~EOS
    LocalPDF Studio is currently unsigned and not notarized by Apple.
    On first launch, macOS may show: "Cannot be opened because the developer cannot be verified."

    To allow the app:
    1. Open Finder → Applications, right-click "LocalPDF Studio", choose "Open"
    2. Confirm in the dialog
    Or via Terminal:
        xattr -dr com.apple.quarantine "/Applications/LocalPDF Studio.app"

    Apple Developer signing/notarization is planned once the project sustains the $99/year cost.
  EOS
end
