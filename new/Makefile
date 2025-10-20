PHONY: run_mjs run_bin
run_mjs:
	bun main.mjs
build_bin:
	bun build --compile --target=bun-linux-x64 main.mjs --outfile build/main
	bun build --compile --target=bun-windows-x64 main.mjs --outfile build/main.exe
run_bin_linux:
	./build/main
run_bin_win32:
	./build/main.exe
