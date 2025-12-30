{ lib
, stdenv
, electron_39-bin
, makeWrapper
, makeDesktopItem
, copyDesktopItems
}:

stdenv.mkDerivation rec {
  pname = "outline-electron";
  version = "1.0.0";

  src = ./.;

  nativeBuildInputs = [ makeWrapper copyDesktopItems ];

  desktopItems = [
    (makeDesktopItem {
      name = "outline-electron";
      desktopName = "Outline";
      comment = "Outline desktop client";
      exec = "outline-electron";
      icon = "outline-electron";
      categories = [ "Office" "Documentation" ];
      terminal = false;
    })
  ];

  installPhase = ''
    runHook preInstall

    mkdir -p $out/lib/outline-electron
    cp -r src/. $out/lib/outline-electron/

    mkdir -p $out/bin
    makeWrapper ${electron_39-bin}/bin/electron $out/bin/outline-electron \
      --add-flags "$out/lib/outline-electron"

    mkdir -p $out/share/icons/hicolor/192x192/apps
    cp assets/icon-192.png $out/share/icons/hicolor/192x192/apps/outline-electron.png

    runHook postInstall
  '';

  meta = with lib; {
    description = "Electron wrapper for Outline wiki";
    homepage = "https://github.com/Mag1cByt3s/outline-electron";
    license = licenses.gpl3Only;
    platforms = platforms.linux;
    mainProgram = "outline-electron";
  };
}
