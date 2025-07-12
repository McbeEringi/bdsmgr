PWD:=$(shell pwd)
run:chmod
	./main.mjs
chmod:
	chmod +x ./main.mjs
restart:
	systemctl --user restart bdsmgr
install:chmod
	sed "s|PWD|$(PWD)/|g" bdsmgr.service>~/.config/systemd/user/bdsmgr.service
	loginctl enable-linger
	systemctl --user enable --now bdsmgr
uninstall:
	systemctl --user disable --now bdsmgr
	loginctl disable-linger
	rm ~/.config/systemd/user/bdsmgr.service
