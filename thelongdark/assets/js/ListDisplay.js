var ListDisplay = function( data ) {
	this.init( data );
}

ListDisplay.prototype = {
	srcData: {},

	json: {},

	badgeDescription: {
		"status-not-updated": "尚未针对当前版本更新或测试，仍可能正常工作。",
		"status-working": "已确认可在当前版本正常工作。",
		"status-not-working": "当前版本无法正常工作，请查看兼容版本信息。",
		"status-with-issues": "可以工作，但存在已知问题。",
		"justupdated": "最近一周内更新。",
		"new": "最近一周内发布。",
		"TFTFT-required": "需要远方 DLC 才能正常使用。",
		"Wintermute-required": "需要冬日秘境 DLC 才能正常使用。"
	},

	categoryNames: {
		"quality-of-life": "生活质量",
		"gameplay": "游戏玩法",
		"gear-items": "装备物品",
		"clothing": "服装",
		"food": "食物",
		"base-building": "基地建设",
		"graphics": "图形",
		"audio": "音频",
		"overhaul": "大型改造",
		"utility-mod": "实用工具",
		"cheats": "作弊",
		"misc": "其他"
	},

	badgeLabels: {
		"status-not-updated": "尚未更新",
		"status-working": "正常工作",
		"status-not-working": "无法工作",
		"status-with-issues": "存在问题",
		"status-no-info": "状态未知",
		"type-mod": "模组",
		"type-plugin": "插件",
		"type-library": "库",
		"justupdated": "近期更新",
		"new": "新发布",
		"TFTFT-required": "需要远方 DLC",
		"Wintermute-required": "需要冬日秘境 DLC",
		"beta": "测试版"
	},

	translateCategory: function( category ) {
		var categoryId = category.replace( /[\s_]+/g, "-" ).toLowerCase();
		return this.categoryNames[ categoryId ] || category;
	},

	init: function( data ) {
		this.srcData = data;
		
		this.buildModList();
	},

	buildModList: function() {

		started = performance.now();

		var _this = this;
		var list = $( "#modList" );
		var itemTemplate = $( "#modTemplate .mod-item-template" );

		const sList = {};
		Object.keys( this.srcData ).sort().forEach( function( key ) {
			sList[ key ] = _this.srcData[ key ];
		} );

		//console.log(sList);

		this.json.modstatus = {};

		for ( var key in sList ) {
			if ( !sList.hasOwnProperty( key ) ) continue;

			var iData = sList[ key ];

			var item = itemTemplate.clone();
			item.removeClass( "mod-item-template" );

			//Elements
			var modBadges = item.find( ".mod-badges" );
			let modThumb = item.find( ".mod-thumb" );
			var modData = item.find( ".mod-data" );
			var modDesc = item.find( ".mod-description" );
			var modLinks = item.find( ".mod-links" );

			//Data
			var mod = {}

			mod.extraClasses = " ";

			mod.author = iData.DisplayAuthor.join( "," );
			mod.authorURL = iData.AuthorUrl;
			mod.name = iData.Name;
			mod.displayName = iData.DisplayName;
			mod.description = iData.Description;
			mod.prevAuthors = iData.PreviousAuthors;
			mod.aliases = iData.Aliases;

			mod.authorDisplay = '<a href="' + mod.authorURL + '">' + mod.author + '</a>';
			mod.authorid = mod.author.toLowerCase().replaceAll( " ", "" );
			mod.id = mod.name.toLowerCase().replaceAll( " ", "" ).replaceAll( "_", "" );
			mod.version = iData.Version;
			//mod.description = iData.description.replace( /(?:\r\n|\r|\n)/g, '<br>' );

			_this.json.modstatus[ mod.id ] = true;

			if ( iData.Type ) {
				if ( iData.Type == "mod" || iData.Type == "plugin" || iData.Type == "library" ) {
					mod.type = iData.Type;
				} else {
					mod.type = "mod";
				}
			} else {
				mod.type = "mod";
			}

			if ( iData.tags ) {
				mod.tagsDisplay = iData.tags;
				mod.tags = iData.tags.trim().replaceAll( " ", "" ).toLowerCase();
			} else {
				mod.tagsDisplay = "";
				mod.tags = "";
			}

			if ( iData.Categories ) {
				var catDisplayList = [];
				var catList = [];

				iData.Categories.forEach( function( cat ) {
					var catID = cat.replaceAll( " ", "-" ).toLowerCase();
					//data-filter-type="category" data-filter="quality-of-life"
					catDisplayList.push( '<span class="inline-filter-item" data-filter-type="category" data-filter="' + catID + '">' + _this.translateCategory( cat ) + '</span>' );
					catList.push( catID );
					app.data.addCategory( catID, _this.translateCategory( cat ) );
					
				} );

				mod.categoriesDisplay = catDisplayList.join( "" );
				mod.categories = catList.join( "," );
			} else {
				mod.categoriesDisplay = "";
				mod.categories = "";
			}

			if ( iData.GameVersion ) {
				mod.gameversion = iData.GameVersion.join( "," ).replaceAll( " ", "-" ).toLowerCase();
			} else {
				mod.gameversion = "vanilla";
			}



			if ( iData.SupportUrl ) {
				mod.supportURL = iData.SupportUrl;
			}

			if ( iData.Images && iData.Images.length ) {
				mod.images = iData.Images;
			}

			if ( iData.Status ) {
				if ( iData.Status.working ) {
					if ( iData.Status.issues != "" ) {
						mod.status = "with-issues";
					} else {
						mod.status = "working";
					}
				} else if ( iData.Status.working === false ) {
					mod.status = "not-working";
				} else {
					mod.status = "no-info";
				}
			} else {
				mod.status = "no-info";
			}
			

			if ( iData.Status.beta ) {
				mod.beta = true;
			} else {
				mod.beta = false;
			}

			if ( iData.TestedOn && iData.TestedOn.tld ) {
				mod.testedon = "TLD v" + iData.TestedOn.tld;

				if ( iData.TestedOn.ml ) {
					mod.testedon += " / ML v" + iData.TestedOn.ml;
				}

				 if ( (app.versionCompare( iData.TestedOn.tld.replaceAll( "+", "" ), app.lastBigPatch ) < 0 || app.versionCompare( iData.TestedOn.ml.replaceAll( "+", "" ), app.mlVersion ) < 0) && iData.Status.working == true) {
						mod.status = "not-updated";
				}
 				else if ( app.versionCompare( iData.TestedOn.tld.replaceAll( "+", "" ), app.minVersion ) < 0 ) {
					mod.status = "not-working";
//					mod.extraClasses += " outdated-mod";
				}  
			} else {
				mod.testedon = "-";
				mod.status = "not-updated";
			}

			if ( iData.Released ) {
				mod.releaseDate = new Date( iData.Released );
				mod.releaseTime = mod.releaseDate.getTime();
			} else {
				mod.releaseDate = false;
				mod.releaseTime = 0;
			}
			mod.updateDate = new Date( iData.Updated );
			mod.updateTime = mod.updateDate.getTime();

			if ( iData.Status && iData.Status.patchnotes ) {
				mod.patchnotes = iData.Status.patchnotes.replace( /(?:\r\n|\r|\n)/g, '<br>' );
			} else {
				mod.patchnotes = "";
			}

			if ( iData.Status && iData.Status.issues ) {
				if ( typeof iData.Status.issues === 'string' ) {
					mod.issues = iData.Status.issues.replace( /(?:\r\n|\r|\n)/g, '<br>' );
				} else {
					mod.issues = iData.Status.issues;
				}
			} else {
				mod.issues = "";
			}

			if ( iData.Status && iData.Status.notes ) {
				mod.notes = iData.Status.notes.replace( /(?:\r\n|\r|\n)/g, '<br>' );
			} else {
				mod.notes = "";
			}

			if ( iData.Dependencies ) {
				var depDisplayList = [];
				var depList = [];

				iData.Dependencies.forEach( function( dep ) {
					var depID = dep.replaceAll( " ", "" ).toLowerCase();
					//data-filter-type="category" data-filter="quality-of-life"
					depDisplayList.push( '<span class="inline-filter-item" data-filter-type="dependency" data-filter="' + depID + '">' + dep + '</span>' );
					depList.push( depID );
				} );

				mod.depsDisplay = depDisplayList.join( ", " );
				mod.depsList = depList.join( "," );
				mod.deps = iData.Dependencies;
			} else {
				mod.deps = [];
			}

			mod.downloadURL = iData.Download;
			mod.modURL = iData.ModUrl;

			mod.badges = {};
			var nowTime = new Date().getTime();
			if(mod.status != "not-working" && mod.status != "not-updated") {
				if ( nowTime - mod.releaseTime < 604800000 ) { //7 days
					mod.badges.new = _this.badgeLabels.new;
				} else if ( nowTime - mod.updateTime < 604800000 ) { //7 days
					mod.badges.justupdated = _this.badgeLabels.justupdated;
				}
			}

			var statusBadge = "status-" + mod.status;
			var typeBadge = "type-" + mod.type;
			mod.badges[ statusBadge ] = _this.badgeLabels[ statusBadge ] || mod.status;
			if ( mod.type !== "mod" ) {
				mod.badges[ typeBadge ] = _this.badgeLabels[ typeBadge ] || mod.type;
			}
			
			if(iData.GameVersion.includes("tftft")) {
				mod.badges[ 'TFTFT-required' ] = _this.badgeLabels[ 'TFTFT-required' ];
			}
			if(iData.GameVersion.includes("wintermute")) {
				mod.badges[ 'Wintermute-required' ] = _this.badgeLabels[ 'Wintermute-required' ];
			}
			
			if ( mod.beta ) {
				mod.badges.beta = _this.badgeLabels.beta;
			}

			//Populate for filters
			app.data.addAuthor( mod.author );
			app.data.addMod( mod.id, mod );
			

			//Fill
			item.attr( "id", mod.id );
			item.attr( "class", "mod-item" + mod.extraClasses )
			item.attr( "data-name", mod.displayName.trim().toLowerCase() );
			item.attr( "data-search", mod.displayName.trim().toLowerCase()+" "+mod.name.trim().toLowerCase() );
			mod.aliases.forEach( function( alias ) {
				if(mod.displayName.trim().toLowerCase() != alias.trim().toLowerCase()) {
				item.attr( "data-search", item.attr( "data-search") + " " + alias.trim().toLowerCase());
				}
			});
			item.attr( "data-search", item.attr( "data-search") +" "+ mod.categories + " " + mod.description.toLowerCase() + " "+ mod.author.toLowerCase()+ " "+ mod.author.replaceAll(" ","").toLowerCase());
			item.attr( "data-status", mod.status );
			item.attr( "data-author", mod.authorid +" "+mod.author.toLowerCase());
			item.attr( "data-tags", mod.tags );
			item.attr( "data-category", mod.categories );
			item.attr( "data-gameversion", mod.gameversion );
			item.attr( "data-type", mod.type );
			if ( mod.updateTime ) {
				var updateTime = new Date( mod.updateTime ).getTime();
				item.attr( "data-update", updateTime );
			} else {
				item.attr( "data-update", "0" );
			}

			modThumb.find( ".thumb-fallback-text" ).html( mod.displayName );
			let thumbImage = modThumb.find( ".thumb-image" );
			let thumbImg = thumbImage.find( "img" );
			if ( mod.images && mod.images.length > 0 ) {
				modThumb.removeClass( "no-image" );
				thumbImage.css( { "display": "block", "visibility": "hidden" } );
				thumbImg
					.off( "error" )
					.on( "error", function() {
						thumbImage.hide();
						thumbImage.closest( ".mod-thumb" ).addClass( "no-image" );
					} )
					.off( "load" )
					.on( "load", function() {
						thumbImage.css( { "display": "block", "visibility": "visible" } );
					} );
				thumbImg.attr( { "alt": mod.displayName, "loading": "lazy", "decoding": "async" } );
				thumbImg.attr( "src", mod.images[ 0 ] );
				if ( thumbImg[ 0 ].complete && thumbImg[ 0 ].naturalWidth > 0 ) {
					thumbImage.css( { "display": "block", "visibility": "visible" } );
				}
			} else {
				thumbImage.hide();
				modThumb.addClass( "no-image" );
			}

			modData.find( ".mod-name-wrapper" ).html( mod.displayName );
			modData.find( ".mod-version-wrapper" ).html( mod.version );
			modData.find( ".mod-author-wrapper" ).html( mod.authorDisplay );
			modData.find( ".mod-categories-list-wrapper" ).html( mod.categoriesDisplay );
			modData.find( ".mod-last-update-wrapper" ).html( mod.updateDate.getDate() + "/" + ( mod.updateDate.getMonth() + 1 ) + "/" + mod.updateDate.getFullYear() );
			modData.find( ".mod-tested-on-wrapper" ).html( mod.testedon );
			modDesc.html( mod.description );

			modLinks.find( ".mod-download" ).attr( "href", mod.downloadURL );

			if ( mod.modURL ) {
				modLinks.find( ".mod-source" ).attr( "href", mod.modURL ).show();
			} else {
				modLinks.find( ".mod-source" ).hide();
			}

			if ( mod.supportURL ) {
				modLinks.find( ".mod-support" ).attr( "href", mod.supportURL ).show();
			} else {
				modLinks.find( ".mod-support" ).hide();
			}

			modLinks.find( ".mod-link" ).on( "click", function( e ) {
				if ( !$( this ).hasClass( "mod-viewmore" ) && !$( this ).hasClass( "mod-download" ) ) {
					e.stopPropagation();
				}
			} );

			Object.keys( mod.badges ).forEach( type => {
				modBadges.append( '<div class="mod-badge mod-badge-' + type + '">\
					<span class="badge-text" title="' + _this.badgeDescription[ type ] + '">' + mod.badges[ type ] + '</span>\
				</div>' );
			} );

			if ( !mod.categories ) {
				modData.find( ".mod-categories" ).hide();
			}

			app.userState.decorateItem( item, mod.id );
			list.append( item );

		}

		$( _this ).trigger( "listcomplete" );
		$( document ).trigger( "dataloaded" );

		//console.log(JSON.stringify(_this.json))

		this.addModDeps();
		
		end = performance.now() - started;
		console.log("buildModList ("+end+"ms)");
		
	},

	addModDeps: function() {
		
		started = performance.now();
		
		$( ".mod-item" ).each( function() {
			var modID = $( this ).attr( "id" );
			var modItem = $( this );

			if ( $( this ).hasClass( 'mod-item-template' ) ) return;

			var modData = app.data.modList[ modID ];

			if ( modData.deps.length ) {
				modItem.find( ".mod-dependencies-download" ).show();

				modItem.find( ".deps-list-wrapper" ).html( "" );

				modData.deps.forEach( function( dep ) {
					var dependency = app.userState.findMod( dep );
					var depURL = dependency && dependency.mod.downloadURL;

					if ( depURL ) {
						var btn = $( '<li><a href="' + depURL + '" target="_blank" rel="noopener noreferrer"></a></li>' );
						btn.find("a").attr("data-modid", dependency.id).text(dep);
					} else {
						var btn = $( '<li><span>' + dep + '</span></li>' );
					}

					modItem.find( ".deps-list-wrapper" ).append( btn );
				} );

				modItem.find( ".mod-dependencies-download" ).off( "click" ).on( "click", function( e ) {
					e.stopPropagation();
					if ( !modItem.find( ".mod-deps-list" ).hasClass( "open" ) ) {
						var openHeight = modItem.find( ".mod-deps-list" )[ 0 ].scrollHeight;
						modItem.find( ".mod-content" ).animate( {
							marginBottom: openHeight
						}, 200 );
						modItem.find( ".mod-deps-list" ).height( openHeight );
						modItem.find( ".mod-dependencies-download" ).addClass( "open" );
						modItem.find( ".mod-deps-list" ).addClass( "open" );
					} else {
						modItem.find( ".mod-deps-list" ).height( 0 );
						modItem.find( ".mod-content" ).animate( {
							marginBottom: 0
						}, 200 );
						modItem.find( ".mod-deps-list" ).removeClass( "open" );
						modItem.find( ".mod-dependencies-download" ).removeClass( "open" );
					}
				} );
			} else {
				modItem.find( ".mod-deps-list" ).height( 0 );
				modItem.find( ".mod-deps-list" ).removeClass( "open" );
				modItem.find( ".mod-dependencies-download" ).off( "click" );
				modItem.find( ".mod-dependencies-download" ).removeClass( "open" );
				modItem.find( ".mod-dependencies-download" ).hide();
				modItem.find( ".deps-list-wrapper" ).html( "" );
			}
		} );
		
		end = performance.now() - started;
		console.log("addModDeps ("+end+"ms)");
	}
}