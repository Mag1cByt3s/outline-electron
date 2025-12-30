{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = [ pkgs.electron_39-bin ];

  shellHook = ''
    echo "Outline Electron dev shell"
    echo "Run: electron ."
  '';
}
