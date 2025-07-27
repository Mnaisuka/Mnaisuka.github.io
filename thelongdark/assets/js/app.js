var TLDmodlist = function () {
	this.init();
}

TLDmodlist.prototype = {

	sourceHandler: null,
	data: null,
	filters: null,
	modals: null,

	loadAll: false,

	query: "",
	sub: "",

	currentVersion: "---",
	lastBigPatch: "---",
	minVersion: "---",
	mlVersion: "---",

	modSources: null,
	modStatusOverride: null,

	init: function () {
		var _this = this;

		const searchParams = new URL(window.location.href).searchParams;
		for (const [key, value] of searchParams) {
			if (key == "show" && value == "all_version") {
				this.loadAll = true;
			}
		}

		$(document).on("dataloaded", function () {
			_this.initFilters();
			_this.initModals();
			_this.removeLoading();
		});

		this.loadInitData();
		this.initEvents();
		window.setTimeout(function () {
			_this.initSources();
		}, 500);

		this.showLoading();

		this.initSidebarScroll();

	},

	showLoading: function () {
		$("#mods-loading").animate({ opacity: 1 }, 300);
	},

	removeLoading: function () {
		$("#mods-loading").fadeOut(300);
	},

	initSidebarScroll: function () {
		$(window).on("scroll", function () {
			var scTop = document.documentElement.scrollTop;
			var scH = window.innerHeight;
			var sbH = $("#sidebar .sidebar-wrapper").height();

			if (scTop + scH >= sbH + 130 && $("#modList").height() > sbH) {
				$("#sidebar .sidebar-wrapper").css({ position: 'fixed', top: scH - sbH - 30 });
			} else {
				$("#sidebar .sidebar-wrapper").css({ position: 'relative', top: 'auto' });
			}
		});
	},

	loadInitData: function () {
		var _this = this;

		this.data = new DataStructures();

		$.getJSON("https://raw.githubusercontent.com/TLD-Mods/ModLists/master/SiteData.json", function (data) {
			if (data.currentVersion) {
				_this.currentVersion = data.currentVersion;
			}

			if (data.latestGameBreaking) {
				_this.minVersion = data.latestGameBreaking;
			}

			if (data.lastBigPatch) {
				_this.lastBigPatch = data.lastBigPatch;
			}
			if (data.melonloaderVersion) {
				_this.mlVersion = data.melonloaderVersion;
			}

			// if (data.modstatus){
			// _this.modStatusOverride = data.modstatus;
			// }

			// if (data.modsources){
			// _this.moSources = data.modsources;
			// }

			$("#current-game-version").html(_this.currentVersion);
			$("#latest-breaking-version").html(_this.minVersion);
			$(".melonloader-version").each(function () {
				$(this).html(_this.mlVersion);
			});
		});
	},

	initEvents: function () {
		var _this = this;
		$(".sort-item").off("click").on("click", function () {
			$(".sort-item").removeClass("active");

			$(".sort-item").find("i").removeClass("fa-caret-up").removeClass("fa-caret-down");

			$(this).addClass("active");

			var curSort = $(".mod-sorting").attr("data-sorting");
			var curDir = $(".mod-sorting").attr("data-sortdir");

			var newSort = $(this).data("sort");
			var newDir = "asc";

			console.log(curSort, curDir, newSort, newDir);

			if (newSort == curSort) {
				if (curDir == "asc") {
					newDir = "desc";
				} else if (curDir == "desc") {
					newDir = "asc";
				}
			} else {
				if (newSort == "update") {
					newDir = "desc";
				}
			}

			_this.applySort(newSort, newDir);
			$(this).removeClass("sort-" + curDir);
			$(this).addClass("sort-" + newDir);


			if (newDir == "asc") {
				$(this).find("i").addClass("fa-caret-up");
			} else {
				$(this).find("i").addClass("fa-caret-down");
			}


			$(".mod-sorting").attr("data-sorting", newSort).attr("data-sortdir", newDir);
		});
	},

	initSources: function () {
		var _this = this;

		this.sourceHandler = new DataLoader();

		$(this.sourceHandler).on("dataLoaded", function () {
			//_this.modList = _this.sourceHandler.modList;
			var list = new ListDisplay(_this.sourceHandler.modList);

			_this.checkQueryParams();
		});

		this.sourceHandler.getModlist();
	},

	initFilters: function () {
		var _this = this;

		this.filters = new Filters();

		this.filters.processURLFilters();
	},

	initModals: function () {
		this.modals = new Modals();
	},

	checkQueryParams: function () {
		if (getParameterByName("q")) {
			var qry = getParameterByName("q");
			$("#searchText").val(qry);
			this.query = qry;
			this.applyFilters();
		}
	},

	applyFilters: function () {
		if (this.query != "") {

			$("#modList .mod-item").hide();

			if (this.sub == "" || this.sub == "all") {
				$("#modList .mod-item[data-name*='" + this.query + "']").show();
				$("#modList .mod-item[id*='" + this.query + "']").show();
				$("#modList .mod-item[data-author*='" + this.query + "']").show();
				$("#modList .mod-item[data-description*='" + this.query + "']").show();
			} else {
				$("#modList .mod-item.mod-" + this.sub + "[data-name*='" + this.query + "']").show();
				$("#modList .mod-item.mod-" + this.sub + "[id*='" + this.query + "']").show();
				$("#modList .mod-item.mod-" + this.sub + "[data-author*='" + this.query + "']").show();
				$("#modList .mod-item.mod-" + this.sub + "[data-description*='" + this.query + "']").show();
			}
		} else {
			if (this.sub == "" || this.sub == "all") {
				$("#modList .mod-item").show();
			} else {
				console.log(this.sub);
				$("#modList .mod-item").hide();
				$("#modList .mod-item.mod-" + this.sub).show();
			}
		}
	},

	resetModEvents: function () {
		/* $(".mod-item").each(function () {
			var modItem = $(this);

			modItem.find(".mod-dependencies-download").off("click").on("click", function (e) {
				e.stopPropagation();
				if (!modItem.find(".mod-deps-list").hasClass("open")) {
					var openHeight = modItem.find(".mod-deps-list")[0].scrollHeight;
					modItem.find(".mod-content").animate({ marginBottom: openHeight }, 200);
					modItem.find(".mod-deps-list").height(openHeight);
					modItem.find(".mod-dependencies-download").addClass("open");
					modItem.find(".mod-deps-list").addClass("open");
				} else {
					modItem.find(".mod-deps-list").height(0);
					modItem.find(".mod-content").animate({ marginBottom: 0 }, 200);
					modItem.find(".mod-deps-list").removeClass("open");
					modItem.find(".mod-dependencies-download").removeClass("open");
				}
			});

		}); */

		this.modals.initEvents();
	},

	applySort: function (type, direction) {

		var $items = $('#modList .mod-item').detach(); // 保留事件等数据

		var sortedItems;

		if (type == "update") {
			sortedItems = $items.sort(function (a, b) {
				var contentA = parseInt($(a).data(type));
				var contentB = parseInt($(b).data(type));
				return direction == "asc" ? contentA - contentB : contentB - contentA;
			});
		} else if (type == "name" || type == "author") {
			sortedItems = $items.sort(function (a, b) {
				var contentA = $(a).data(type);
				var contentB = $(b).data(type);
				if (contentA < contentB) return direction == "asc" ? -1 : 1;
				if (contentA > contentB) return direction == "asc" ? 1 : -1;
				return 0;
			});
		}

		$('#modList').append(sortedItems); // 重新插入，事件不丢失

		this.resetModEvents();
	},

	versionCompare: function (v1, v2, options) {
		var lexicographical = options && options.lexicographical,
			zeroExtend = options && options.zeroExtend,
			v1parts = v1.split('.'),
			v2parts = v2.split('.');

		function isValidPart(x) {
			return (lexicographical ? /^\d+[A-Za-z]*$/ : /^\d+$/).test(x);
		}

		if (!v1parts.every(isValidPart) || !v2parts.every(isValidPart)) {
			return NaN;
		}

		if (zeroExtend) {
			while (v1parts.length < v2parts.length) v1parts.push("0");
			while (v2parts.length < v1parts.length) v2parts.push("0");
		}

		if (!lexicographical) {
			v1parts = v1parts.map(Number);
			v2parts = v2parts.map(Number);
		}

		for (var i = 0; i < v1parts.length; ++i) {
			if (v2parts.length == i) {
				return 1;
			}

			if (v1parts[i] == v2parts[i]) {
				continue;
			}
			else if (v1parts[i] > v2parts[i]) {
				return 1;
			}
			else {
				return -1;
			}
		}

		if (v1parts.length != v2parts.length) {
			return -1;
		}

		return 0;
	},

	formatDate: function (date) {
		return date.getDate() + "/" + (date.getMonth() + 1) + "/" + date.getFullYear();
	},

	formatCategories: function (cats) {

	}
}

var app;

$(document).ready(function () {
	app = new TLDmodlist();
});

function getParameterByName(name, url = window.location.href) {
	name = name.replace(/[\[\]]/g, '\\$&');
	var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
		results = regex.exec(url);
	if (!results) return null;
	if (!results[2]) return '';
	return decodeURIComponent(results[2].replace(/\+/g, ' '));
}