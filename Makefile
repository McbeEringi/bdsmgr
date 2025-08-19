PWD:=$(shell pwd)
NAME:=bdsmgr@
SVR_DIR:=$(shell bun "data://text/plain,import cfg from'./config.mjs';Bun.stdout.write(cfg.dir.svr);")
SVR:=$(shell ls $(SVR_DIR))


run_test_svr:chmod
	./main.mjs makefile_test
chmod:
	chmod +x ./main.mjs
pull:
	git pull
update:pull restart

install:chmod
	sed "s|PWD|$(PWD)|g" $(NAME).service>~/.config/systemd/user/$(NAME).service
	loginctl enable-linger
uninstall:
	loginctl disable-linger
	rm ~/.config/systemd/user/$(NAME).service

restart:$(addprefix svr-r-,$(SVR))
svr-r:$(addprefix svr-r-,$(SVR))
svr-r-%:
	systemctl --user restart $(NAME)${@:svr-r-%=%}
svr-i:$(addprefix svr-i-,$(SVR))
svr-i-%:install
	systemctl --user enable --now $(NAME)${@:svr-i-%=%}
svr-u:$(addprefix svr-u-,$(SVR))
svr-u-%:
	systemctl --user disable --now $(NAME)${@:svr-u-%=%}
