var UserState = function () {
	this.storageKey = "tld-mod-catalog-state-v1";
	this.favorites = new Set();
	this.downloaded = new Set();
	this.view = "all";
	this.pendingModId = null;
	this.noticeTimer = null;
	this.load();
	this.initEvents();
};

UserState.prototype = {
	load: function () {
		try {
			var stored = window.localStorage.getItem(this.storageKey);
			if (!stored) return;

			var state = JSON.parse(stored);
			this.favorites = new Set(Array.isArray(state.favorites) ? state.favorites : []);
			this.downloaded = new Set(Array.isArray(state.downloaded) ? state.downloaded : []);
		} catch (error) {
			console.error("Could not load saved mod catalog state.", error);
			this.showNotice("读取本地收藏和下载状态失败，本次页面会话仍可正常使用。");
		}
	},

	save: function () {
		try {
			window.localStorage.setItem(this.storageKey, JSON.stringify({
				favorites: Array.from(this.favorites),
				downloaded: Array.from(this.downloaded)
			}));
		} catch (error) {
			console.error("Could not save mod catalog state.", error);
			this.showNotice("无法保存到浏览器存储；请检查浏览器隐私设置或可用空间。");
		}
	},

	initEvents: function () {
		var _this = this;

		$(document).on("click", ".favorite-toggle", function (event) {
			event.preventDefault();
			event.stopPropagation();
			var modId = _this.getItemId($(this));
			if (!modId) return;

			if (_this.favorites.has(modId)) {
				_this.favorites.delete(modId);
			} else {
				_this.favorites.add(modId);
			}
			_this.save();
			_this.refresh();
		});

		$(document).on("click", ".catalog-view", function () {
			_this.view = $(this).attr("data-view");
			$(".catalog-view").removeClass("active").attr("aria-selected", "false");
			$(this).addClass("active").attr("aria-selected", "true");
			if (app.filters) app.filters.applyFilters();
		});

		$(document).on("click", ".empty-show-all", function () {
			_this.view = "all";
			$(".catalog-view").removeClass("active").attr("aria-selected", "false");
			$(".catalog-view[data-view='all']").addClass("active").attr("aria-selected", "true");
			if (app.filters) app.filters.applyFilters();
		});

		$(document).on("click", ".reset-downloaded", function () {
			if (!_this.downloaded.size) {
				_this.showNotice("目前没有已下载标记。");
				return;
			}
			if (!window.confirm("确定清除所有已下载标记吗？此操作不会删除电脑中的模组文件。")) return;
			_this.downloaded.clear();
			_this.save();
			_this.refresh();
			_this.showNotice("已清除所有已下载标记。");
		});

		$(document).on("click", "#modList .mod-download, .mod-modal .mod-download", function (event) {
			var modId = _this.getItemId($(this));
			if (!modId) return;
			var downloadUrl = $(this).attr("href");
			if (!downloadUrl || downloadUrl === "#") {
				event.preventDefault();
				_this.showNotice("这个模组暂时没有可用的下载链接。");
				return;
			}

			var missing = _this.collectMissingDependencies(modId);
			if (missing.length) {
				event.preventDefault();
				event.stopPropagation();
				_this.pendingModId = modId;
				_this.renderDependencyDialog(missing);
				return;
			}

			_this.markDownloaded(modId);
		});

		$(document).on('contextmenu', "#modList .mod-download, .mod-modal .mod-download", function (e) {
			e.preventDefault();
		});

		$(document).on("click", ".dependency-download", function () {
			var modId = $(this).attr("data-modid");
			var mod = app.data.modList[modId];
			if (!mod || !mod.downloadURL) return;
			_this.markDownloaded(modId);
			window.open(mod.downloadURL, "_blank", "noopener");
			window.on_download?.(this,app.data.modList[modId]);
			_this.renderDependencyDialog(_this.collectMissingDependencies(_this.pendingModId));
		});

		$(document).on("click", ".deps-list-wrapper a[data-modid]", function () {
			_this.markDownloaded($(this).attr("data-modid"));
		});

		$(".dependency-continue").on("click", function () {
			var mod = app.data.modList[_this.pendingModId];
			if (mod && mod.downloadURL) {
				_this.markDownloaded(_this.pendingModId);
				window.open(mod.downloadURL, "_blank", "noopener");
				window.on_download?.(this,app.data.modList[modId]);
			}
			_this.closeDependencyDialog();
		});

		$(".dependency-close, .dependency-cancel, .dependency-overlay").on("click", function () {
			_this.closeDependencyDialog();
		});

		$(document).on("keydown", function (event) {
			if (event.key === "Escape") {
				_this.closeDependencyDialog();
				_this.closeMobileFilters();
			}
			if (event.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) {
				event.preventDefault();
				$("#searchText").trigger("focus");
			}
		});

		$(".mobile-filter-toggle").on("click", function () {
			_this.toggleMobileFilters();
		});
		$(".filter-close").on("click", function () {
			_this.closeMobileFilters();
		});
		$(".filter-backdrop").on("click", function () {
			_this.closeMobileFilters();
		});
	},

	getItemId: function (element) {
		var item = element.closest(".mod-item");
		if (item.length) return item.attr("id");
		return $(".mod-modal-wrapper").attr("data-modid") || "";
	},

	decorateItem: function (item, modId) {
		var favorite = this.favorites.has(modId);
		var downloaded = this.downloaded.has(modId);
		item.find(".favorite-toggle")
			.toggleClass("is-favorite", favorite)
			.attr("aria-pressed", favorite ? "true" : "false")
			.find("span").text(favorite ? "已收藏" : "收藏");

		item.toggleClass("is-downloaded", downloaded);
		item.find(".mod-badges").find(".downloaded-badge").remove();
		if (downloaded) {
			item.find(".mod-badges").append('<div class="downloaded-badge"><i class="fas fa-check-circle" aria-hidden="true"></i> 已下载</div>');
		}
	},

	decorateModal: function (modId) {
		var favorite = this.favorites.has(modId);
		$(".mod-modal-wrapper .favorite-toggle")
			.toggleClass("is-favorite", favorite)
			.attr("aria-pressed", favorite ? "true" : "false")
			.find("span").text(favorite ? "已收藏" : "收藏");
	},

	markDownloaded: function (modId) {
		if (!modId || this.downloaded.has(modId)) return;
		this.downloaded.add(modId);
		this.save();
		this.refresh();
	},

	refresh: function () {
		var _this = this;
		$("#modList .mod-item").each(function () {
			_this.decorateItem($(this), $(this).attr("id"));
		});
		this.decorateModal($(".mod-modal-wrapper").attr("data-modid"));
		$(".catalog-view .view-count[data-count='all']").text($("#modList .mod-item").length);
		$(".catalog-view .view-count[data-count='favorites']").text($("#modList .mod-item").filter(function () {
			return _this.favorites.has(this.id);
		}).length);
		$(".catalog-view .view-count[data-count='downloaded']").text($("#modList .mod-item").filter(function () {
			return _this.downloaded.has(this.id);
		}).length);
		$("#catalog-total").text($("#modList .mod-item").length);
		if (app.filters) app.filters.applyFilters();
	},

	collectMissingDependencies: function (modId) {
		var _this = this;
		var missing = [];
		var visited = new Set();
		var listed = new Set();
		var mod = app.data.modList[modId];

		function visit(currentMod) {
			(currentMod.deps || []).forEach(function (dependencyName) {
				var dependencyId = _this.normalizeId(dependencyName);
				if (visited.has(dependencyId)) return;
				visited.add(dependencyId);

				var entry = _this.findMod(dependencyId);
				var dependency = entry && entry.mod;
				if (!dependency) {
					if (!listed.has(dependencyId)) {
						listed.add(dependencyId);
						missing.push({ id: dependencyId, name: dependencyName, mod: null });
					}
					return;
				}

				if (_this.downloaded.has(entry.id)) return;
				visit(dependency);
				if (!listed.has(dependencyId)) {
					listed.add(dependencyId);
					missing.push({ id: entry.id, name: dependency.displayName || dependency.name, mod: dependency });
				}
			});
		}

		if (mod) visit(mod);
		return missing;
	},

	normalizeId: function (value) {
		return String(value || "").toLowerCase().replace(/[\s_-]/g, "");
	},

	findMod: function (id) {
		var normalized = this.normalizeId(id);
		var keys = Object.keys(app.data.modList);
		for (var index = 0; index < keys.length; index++) {
			if (this.normalizeId(keys[index]) === normalized) {
				return { id: keys[index], mod: app.data.modList[keys[index]] };
			}
		}
		return null;
	},

	renderDependencyDialog: function (missing) {
		var list = $(".dependency-items").empty();
		var _this = this;
		missing.forEach(function (dependency) {
			var row = $("<li></li>");
			var details = $("<span class='dependency-name'></span>").text(dependency.name);
			row.append(details);
			if (dependency.mod && dependency.mod.downloadURL) {
				row.append($("<button class='dependency-download' type='button'></button>")
					.attr("data-modid", dependency.id)
					.html('<i class="fas fa-download" aria-hidden="true"></i> 下载'));
			} else {
				row.append($("<span class='dependency-unavailable'></span>").text("目录中暂无下载链接"));
			}
			list.append(row);
		});

		var allResolved = missing.length === 0;
		$(".dependency-continue").prop("disabled", !allResolved);
		$(".dependency-intro").text(
			missing.length
				? "目标模组依赖 " + missing.length + " 项尚未标记下载的前置模组。"
				: "前置模组已标记完成，可以继续下载。"
		);
		$("#dependency-dialog").addClass("is-open").attr("aria-hidden", "false");
		$(".dependency-close").trigger("focus");
	},

	closeDependencyDialog: function () {
		$("#dependency-dialog").removeClass("is-open").attr("aria-hidden", "true");
		this.pendingModId = null;
	},

	toggleMobileFilters: function () {
		$("body").toggleClass("filters-open");
		$(".mobile-filter-toggle").attr("aria-expanded", $("body").hasClass("filters-open") ? "true" : "false");
	},

	closeMobileFilters: function () {
		$("body").removeClass("filters-open");
		$(".mobile-filter-toggle").attr("aria-expanded", "false");
	},

	showNotice: function (message) {
		var _this = this;
		$("#app-notice").text(message).addClass("is-visible");
		window.clearTimeout(this.noticeTimer);
		this.noticeTimer = window.setTimeout(function () {
			$("#app-notice").removeClass("is-visible");
		}, 4200);
	}
};
