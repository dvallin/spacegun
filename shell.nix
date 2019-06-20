let
    nixpkgs = import <nixpkgs> {
        config.allowUnfree = false;
        overlays = [ ];
    };
    nodejs = nixpkgs.nodejs-12_x;

    yarn = nixpkgs.yarn.override {
      nodejs = [ nodejs ];
    };
in
    with nixpkgs;
    stdenv.mkDerivation rec {
        name = "spacegun";
        env = buildEnv { name = name; paths = buildInputs; };
        buildInputs = [
            # List packages that should be on the path
            # You can search for package names using nix-env -qaP | grep <name>
            nodejs
            yarn
            nixpkgs.minikube
        ];

        shellHook = ''
        '';
    }
