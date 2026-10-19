var Filters = function(){
	this.init();
}

Filters.prototype = {
	$authorFilter: null,
	$catFilter: null,
	$search: null,
	$versionFilter: null,
	$statusFilter: null,

	currentFilters:{},

	init:function(){
		this.initFilters();
		this.populateFilters();

		this.initFilterEvents();
		
		this.processURLFilters();

		//$(".filter-item[data-filter='working']").click();
	},

	initFilters: function(){
		this.$authorFilter = $(".filter-holder[data-filter-type='author']");
		this.$catFilter = $(".filter-holder[data-filter-type='category']");
		this.$search = $("#searchText");
	},

	populateFilters(){
		var _this = this;

		this.$authorFilter.html("");
		app.data.authorList.forEach(function(author){
			_this.$authorFilter.append('<li class="filter-item" data-filter-type="author" data-filter="'+author.toLowerCase().replaceAll(" ","-")+'">'+author+'</li>');
		});
		
		this.$catFilter.html("");
		for (const [key, value] of Object.entries(app.data.catList).sort()) {
		  _this.$catFilter.append('<li class="filter-item" data-filter-type="category" data-filter="'+key+'">'+value+'</li>');
		}
	},

	initFilterEvents: function(){
		var _this = this;

		$(".filter-item").off("click").on("click", function(){
			$(this).toggleClass("selected");

			var filterType = $(this).attr("data-filter-type");
			var filterVal = $(this).attr("data-filter");

			$('html,body').animate({scrollTop: 0},300);

			if ($(this).hasClass("selected")){

				if (_this.currentFilters[filterType]){
					_this.currentFilters[filterType].push(filterVal);
				}else{
					_this.currentFilters[filterType] = [filterVal];
				}
			}else{
				var index = _this.currentFilters[filterType].indexOf(filterVal);
  				if (index > -1) {
    				_this.currentFilters[filterType].splice(index, 1);
  				}

  				if (_this.currentFilters[filterType].length == 0){
  					_this.currentFilters[filterType] = null;
  					delete _this.currentFilters[filterType];
  				}
			}

			_this.applyFilters();
		});

		_this.setupInlineFilters();

		this.$search.on("input", function(){
			_this.applyFilters();
		});

		$(".filter-action.reset-filters").off("click").on("click", function(){
			_this.resetFilters();
		});

		$(".filter-action.copy-url").off("click").on("click", function(){
			var url = _this.createFilterURL();
			if (navigator.clipboard && navigator.clipboard.writeText) {
				navigator.clipboard.writeText(url).then(function() {
					app.userState.showNotice("筛选链接已复制。");
				}).catch(function(error) {
					console.error("Could not copy filter URL.", error);
					window.prompt("复制筛选链接：", url);
				});
			} else {
				window.prompt("复制筛选链接：", url);
			}
		});
	},

	setupInlineFilters: function(){
		var _this = this;

		$(".inline-filter-item").off("click").on("click", function(event){
			event.preventDefault();
			event.stopPropagation();
			
			var filterType = $(this).attr("data-filter-type");
			var filterVal = $(this).attr("data-filter");

			if (filterType != "dependency"){

				$(".filter-item[data-filter-type='"+filterType+"'][data-filter='"+filterVal+"']").addClass("selected");

				if (_this.currentFilters[filterType] && _this.currentFilters[filterType].indexOf(filterVal) > -1){
					_this.currentFilters[filterType].push(filterVal);
				}else{
					_this.currentFilters[filterType] = [filterVal];
				}

			}else{
				$("#searchText").val(filterVal);
			}
			
			app.modals.closeModal();

			_this.applyFilters();
			if (app.userState) app.userState.closeMobileFilters();
		});
	},

	resetFilters: function(){
		$(".filter-item").removeClass("selected");
		$("#searchText").val("");

		this.currentFilters = {};

		this.applyFilters();
		var url = new URL(window.location.href);
		url.search = "";
		window.history.replaceState(null, "", url.toString());
	},

	processURLFilters: function(){
		var _this = this;

		const searchParams = new URL(window.location.href).searchParams;
		for (const [key, value] of searchParams) {
			if (key == "q"){
				$("#searchText").val(value);
			}else{
				var filterValues = value.split(",");

				filterValues.forEach(function(val){
					$(".filter-item[data-filter-type='"+key+"'][data-filter='"+val+"']").addClass("selected");

					if (_this.currentFilters[key] && _this.currentFilters[key].indexOf(val) > -1){
						_this.currentFilters[key].push(val);
					}else{
						_this.currentFilters[key] = [val];
					}
				});				
			}
		}

		this.applyFilters();
	},

	createFilterURL: function(){
		var url = new URL(window.location.href);
		var params = new URLSearchParams();
		var query = this.$search.val().trim();
		if (query) params.set("q", query);

		$(".filter-holder").each(function(){
			var type = $(this).data("filter-type");
			var values = [];

			$(this).find(".filter-item").each(function(){
				if ($(this).hasClass("selected")){
					values.push($(this).data("filter"));
				}
			});

			if (values.length){
				params.set(type, values.join(","));
			}
		});

		url.search = params.toString();
		return url.toString();
	},

	applyFilters: function(){
		var _this = this;

		var count = 0;

		$("#modList .mod-item").hide();

		var query = this.$search.val().trim().toLowerCase().replaceAll("-"," ");
//			console.log(_this.currentFilters);

		$("#modList .mod-item").each(function(){

			var item = $(this);
			var showItem = true;

			if (query){
				if (item.attr("data-search").indexOf(query) == -1 &&
					item.attr("id").indexOf(query) == -1 &&
					item.attr("data-author").indexOf(query) == -1 &&
					item.attr("data-tags").indexOf(query) == -1){

					showItem = false;
				}
			}

			var foundFilter = false;
			
			//Category filter
			if (_this.currentFilters.category){
				foundFilter = false;
				_this.currentFilters.category.forEach(function(fCategory){
					if (item.attr("data-category").indexOf(fCategory) != -1 || item.attr("data-category").indexOf(fCategory.replaceAll("-"," ")) != -1 || item.attr("data-category").indexOf(fCategory.replaceAll("-","")) != -1){
						foundFilter = true;
					}
				});

				if (!foundFilter){
					showItem = false;
				}
			}

			//Author filter
			if (_this.currentFilters.author){
				foundFilter = false;
				_this.currentFilters.author.forEach(function(fAuthor){
					if (item.attr("data-author").indexOf(fAuthor) != -1 || item.attr("data-author").indexOf(fAuthor.replaceAll("-"," ")) != -1 || item.attr("data-author").indexOf(fAuthor.replaceAll("-","")) != -1){
						foundFilter = true;
					}
				});

				if (!foundFilter){
					showItem = false;
				}
			}

			//Type filter
			if (_this.currentFilters.type){
				foundFilter = false;
				_this.currentFilters.type.forEach(function(fType){
					if (item.attr("data-type").indexOf(fType) != -1){
						foundFilter = true;
					}
				});

				if (!foundFilter){
					showItem = false;
				}
			}

			//Version filter
			if (_this.currentFilters.gameversion){
				foundFilter = false;
				_this.currentFilters.gameversion.forEach(function(fVersion){
					if (item.attr("data-gameversion").indexOf(fVersion) != -1){
						foundFilter = true;
					}
				});

				if (!foundFilter){
					showItem = false;
				}
			}

			//Status filter
			if (_this.currentFilters.status){
				foundFilter = false;
				_this.currentFilters.status.forEach(function(fStatus){
					
					thisStatus = item.attr("data-status").trim().toLowerCase();
						if (thisStatus == fStatus){
						foundFilter = true;
						}

						if (thisStatus == "not-working") {
							item.addClass("force-not-working");
						} else {
							item.removeClass("force-not-working");
						}
				});

				if (!foundFilter){
					showItem = false;
				}
			}

			if (app.userState && app.userState.view === "favorites" && !app.userState.favorites.has(item.attr("id"))) {
				showItem = false;
			}
			if (app.userState && app.userState.view === "downloaded" && !app.userState.downloaded.has(item.attr("id"))) {
				showItem = false;
			}

			if (showItem){
				item.show();
			}
			

			
		});

		if (!query && jQuery.isEmptyObject(this.currentFilters) &&
			(!app.userState || app.userState.view == "all")){
			$("#modList .mod-item").show();
		}

		$(".results-count .num-results").text($("#modList .mod-item:visible").length);
		var empty = $("#modList .mod-item:visible").length === 0;
		$("#empty-state").prop("hidden", !empty);
		$("#empty-state .reset-filters").prop("hidden", !empty || (app.userState && app.userState.view !== "all"));
		$("#empty-state .empty-show-all").prop("hidden", !empty || !app.userState || app.userState.view === "all");
		if (empty && app.userState && app.userState.view !== "all") {
			var emptyView = app.userState.view === "favorites" ? "收藏" : "已下载";
			$("#empty-state .empty-description").text(emptyView + "列表还是空的，返回全部模组继续探索。");
		} else {
			$("#empty-state .empty-description").text("试试调整筛选条件，或先收藏几个喜欢的模组。");
		}

		$(".mod-item-template").hide();
	}
}