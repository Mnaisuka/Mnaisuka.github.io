var Modals = function () {
	this.init();
}

Modals.prototype = {

	modalOpen: false,
	modal: null,
	modalSwiper: false,

	init: function () {
		this.modal = $(".mod-modal-wrapper");
		this.initEvents();
	},

	initEvents: function () {
		var _this = this;

		$("#modList .mod-item").off("click").on("click", function (e) {
			var hover_element = $(':hover').last();

			if (hover_element.hasClass("mod-link") || hover_element.parent().hasClass("mod-link")) {
				if (!hover_element.hasClass("mod-viewmore") || hover_element.parent().hasClass("mod-viewmore")) {
					//				console.log(hover_element);
					return;
				}
			}
			e.preventDefault();

			var modID = $(this).attr("id");

			_this.openModal(modID);
		});

		$(".modal-close, .modal-overlay").off("click").on("click", function () {
			_this.closeModal();
		});
	},

	openModal: function (modID) {
		var _this = this;

		var modData = app.data.modList[modID];
		this.modalOpen = modID;

		console.log(modData);

		//Fill Modal
		this.modal.find(".modal-name").html(modData.displayName);
		this.modal.find(".modal-version").html("v" + modData.version);
		this.modal.find(".modal-author").html("by " + modData.authorDisplay);

		if (modData.prevAuthors) {
			this.modal.find(".modal-prev-author").show().html("Previously by " + modData.prevAuthors);
		} else {
			this.modal.find(".modal-prev-author").hide();
		}

		this.modal.find(".modal-description").html(modData.description);

		if (modData.patchnotes) {
			this.modal.find(".mod-patchnotes").show().find(".info-data").html(modData.patchnotes);
		} else {
			this.modal.find(".mod-patchnotes").hide();
		}

		if (modData.releaseDate) {
			this.modal.find(".mod-released").show().find(".info-data").html(app.formatDate(modData.releaseDate));
		} else {
			this.modal.find(".mod-released").hide();
		}

		if (modData.updateDate) {
			this.modal.find(".mod-updated").show().find(".info-data").html(app.formatDate(modData.updateDate));
		} else {
			this.modal.find(".mod-updated").hide();
		}

		if (modData.categories) {
			this.modal.find(".mod-categories").show().find(".info-data").html(modData.categoriesDisplay);
		} else {
			this.modal.find(".mod-categories").hide();
		}

		//Status
		this.modal.find(".mod-status").show().find(".info-data").html(modData.status.replace("-", " "));

		if (modData.notes) {
			this.modal.find(".mod-notes").show().find(".info-data").html(modData.notes);
		} else {
			this.modal.find(".mod-notes").hide();
		}

		if (modData.issues) {
			this.modal.find(".mod-issues").show().find(".info-data").html(modData.issues);
		} else {
			this.modal.find(".mod-issues").hide();
		}

		if (modData.deps.length) {
			this.modal.find(".mod-dependencies").show().find(".info-data").html(modData.depsDisplay);
			this.modal.find(".mod-dependencies-download").show();

			this.modal.find(".deps-list-wrapper").html("");

			modData.deps.forEach(function (dep) {
				var depID = dep.replaceAll(" ", "-").toLowerCase();
				if (app.data.modList[depID]) {
					var depURL = app.data.modList[depID].downloadURL;
				} else {
					var depURL = false;
				}

				if (depURL) {
					var btn = $('<li><a href="' + depURL + '" target="_blank"><i class="fal fa-download" aria-hidden="true"></i> ' + dep + '</a></li>');
				} else {
					var btn = $('<li><span>' + dep + '</span></li>');
				}

				_this.modal.find(".deps-list-wrapper").append(btn);
			});

			this.modal.find(".mod-dependencies-download").off("click").on("click", function () {
				if (!$(".deps-list").hasClass("open")) {
					_this.modal.find(".deps-list").height($(".deps-list")[0].scrollHeight);
					_this.modal.find(".mod-dependencies-download").addClass("open");
					_this.modal.find(".deps-list").addClass("open");
				} else {
					_this.modal.find(".deps-list").height(0);
					_this.modal.find(".deps-list").removeClass("open");
					_this.modal.find(".mod-dependencies-download").removeClass("open");
				}
			});
		} else {
			this.modal.find(".mod-dependencies").hide();
			this.modal.find(".deps-list").height(0);
			this.modal.find(".deps-list").removeClass("open");
			this.modal.find(".mod-dependencies-download").removeClass("open");
			this.modal.find(".mod-dependencies-download").hide();
			this.modal.find(".deps-list-wrapper").html("");
		}

		if (modData.downloadURL) {
			this.modal.find(".mod-download").show().attr("href", modData.downloadURL);
		} else {
			this.modal.find(".mod-download").hide();
		}

		if (modData.modURL) {
			this.modal.find(".mod-source").show().attr("href", modData.modURL);
		} else {
			this.modal.find(".mod-source").hide();
		}

		if (modData.supportURL) {
			this.modal.find(".mod-support").show().attr("href", modData.supportURL);
		} else {
			this.modal.find(".mod-support").hide();
		}

		if (this.swiper) {
			this.swiper.destroy();
		}

		if (modData.images) {
			this.modal.removeClass("no-images");

			if (modData.images.length > 1) {

				var swiper = $('<div class="swiper"></div>').addClass("tld-swiper");
				var wrapper = $('<div class="swiper-wrapper"></div>');
				var arrowL = $('<div class="swiper-button-prev"></div>');
				var arrowR = $('<div class="swiper-button-next"></div>');

				modData.images.forEach(function (item) {
					var img = $("<img />").attr("src", item);
					var slide = $('<div class="swiper-slide"></div>');

					slide.append(img);
					wrapper.append(slide);
				});

				swiper.append(wrapper);
				swiper.append(arrowL);
				swiper.append(arrowR);

				this.modal.find(".modal-images").html("").append(swiper);

				this.swiper = new Swiper(".tld-swiper", {
					loop: true,

					navigation: {
						nextEl: '.swiper-button-next',
						prevEl: '.swiper-button-prev',
					},
				});

			} else {
				var img = $("<img />").attr("src", modData.images[0]);
				this.modal.find(".modal-images").html("");
				this.modal.find(".modal-images").append(img);
			}
		} else {
			this.modal.addClass("no-images");
		}

		app.filters.setupInlineFilters();

		this.modal.css("display", "flex").hide().fadeIn(200);
	},

	closeModal: function () {
		this.modalOpen = false;
		this.modal.fadeOut(200);
	}
}