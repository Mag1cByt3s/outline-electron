{
  description = "Outline Electron wrapper";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = { self, nixpkgs }:
    let
      system = "x86_64-linux";
      pkgs = nixpkgs.legacyPackages.${system};
    in
    {
      packages.${system} = rec {
        outline-electron = pkgs.callPackage ./package.nix { };
        default = outline-electron;
      };

      apps.${system}.default = {
        type = "app";
        program = "${self.packages.${system}.default}/bin/outline-electron";
      };

      devShells.${system}.default = pkgs.mkShell {
        buildInputs = [ pkgs.electron_39-bin ];
      };
    };
}
