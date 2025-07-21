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

		//$(".filter-item[data-filter='working']").click();
	},

	initFilters: function(){
		this.$authorFilter = $(".filter-holder[data-filter-type='author']");
		this.$search = $("#searchText");
	},

	populateFilters(){
		var _this = this;

		this.$authorFilter.html("");

		app.data.authorList.forEach(function(author){
			_this.$authorFilter.append('<li class="filter-item" data-filter-type="author" data-filter="'+author.toLowerCase().replaceAll(" ","-")+'">'+author+'</li>');
		});
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
			console.log(url);
			window.location.href=url;
		});
	},

	setupInlineFilters: function(){
		var _this = this;

		$(".inline-filter-item").off("click").on("click", function(){
			
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
		});
	},

	resetFilters: function(){
		$(".filter-item").removeClass("selected");
		$("#searchText").val("");

		this.currentFilters = {};

		this.applyFilters();
		window.location.href="/";
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
		var url = location.protocol + '//' + location.host + location.pathname + "?";

		url += "q="+$("#searchText").val();

		$(".filter-holder").each(function(){
			var type = $(this).data("filter-type");
			var values = [];

			$(this).find(".filter-item").each(function(){
				if ($(this).hasClass("selected")){
					values.push($(this).data("filter"));
				}
			});

			if (values.length){
				url += "&"+type+"="+values.join(",");
			}
		});

		return url;
	},

	applyFilters: function(){
		var _this = this;

		var count = 0;

		$("#modList .mod-item").hide();

		var query = this.$search.val().trim().toLowerCase().replaceAll("-"," ");
console.log(query);
			console.log(_this.currentFilters);

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
//					if (item.attr("data-status").indexOf(fStatus) != -1){
						if (item.attr("data-status") == fStatus){
						foundFilter = true;
						}

//						if (fStatus == "not-working") item.addClass("force-not-working");
//					}else{
//						item.removeClass("force-not-working");
//					}
				});

				if (!foundFilter){
					showItem = false;
				}
			}

			if (showItem){
				item.show();
			}
		});

		if (!query && jQuery.isEmptyObject(this.currentFilters)){
			$("#modList .mod-item").show();
		}

		$(".results-count .num-results").text($("#modList .mod-item:visible").length);

		$(".mod-item-template").hide();
	}
}