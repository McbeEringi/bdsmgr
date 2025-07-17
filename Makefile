PWD:=$(shell pwd)
NAME:=bdsmgr
run:chmod
	./main.mjs
chmod:
	chmod +x ./main.mjs
restart:
	systemctl --user restart $(NAME)
install:chmod
	sed "s|PWD|$(PWD)/|g" $(NAME).service>~/.config/systemd/user/$(NAME).service
	loginctl enable-linger
	systemctl --user enable --now $(NAME)
uninstall:
	systemctl --user disable --now $(NAME)
	loginctl disable-linger
	rm ~/.config/systemd/user/$(NAME).service
pull:
	git pull
update:pull restart
