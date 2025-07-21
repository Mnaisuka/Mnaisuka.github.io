var ListDisplay = function( data ) {
	this.init( data );
}

ListDisplay.prototype = {
	srcData: {},

	json: {},

	badgeDescription: {
		"status-not-updated": "Mod hasn't been updated or tested in latest version, it might still work, but there's a chance that the update broke something",
		"status-working": "Mod is confirmed as working in latest version",
		"status-not-working": "Mod is broken in current version. Check the Tested on info to see what was the last compatible version",
		"status-with-issues": "Mod works but has some issues, check the mod details for more info",
		"justupdated": "Mod has been updated in the past week",
		"new": "Mod has been released in the past week"
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
			var modThumb = item.find( ".mod-thumb" );
			var modData = item.find( ".mod-data" );
			var modDesc = item.find( ".mod-description" );
			var modLinks = item.find( ".mod-links" );

			//Data
			var mod = {}

			mod.extraClasses = " ";

			mod.author = iData.DisplayAuthor.join( "," );
			mod.authorURL = iData.AuthorUrl;
			mod.name = iData.Name;
			mod.displayName = mod.name;
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
					var catID = cat.replaceAll( " ", "" ).toLowerCase();
					//data-filter-type="category" data-filter="quality-of-life"
					catDisplayList.push( '<span class="inline-filter-item" data-filter-type="category" data-filter="' + catID + '">' + cat + '</span>' );
					catList.push( catID );
				} );

				mod.categoriesDisplay = catDisplayList.join( ", " );
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

				 if ( app.versionCompare( iData.TestedOn.tld.replaceAll( "+", "" ), app.lastBigPatch ) < 0 && iData.Status.working == true) {
						//mod.status = "not-updated";
				}
// 				else if ( app.versionCompare( iData.TestedOn.tld.replaceAll( "+", "" ), app.minVersion ) < 0 ) {
//					mod.status = "not-working";
//					mod.extraClasses += " outdated-mod";
//				}  
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

			mod.downloadURL = iData.Download.browser_download_url;
			mod.modURL = iData.ModUrl;

			mod.badges = {};
			var nowTime = new Date().getTime();
			if ( nowTime - mod.releaseTime < 604800000 ) { //7 days
				mod.badges.new = "NEW";
			} else if ( nowTime - mod.updateTime < 604800000 ) { //7 days
				mod.badges.justupdated = "JUST UPDATED";
			}

			mod.badges[ 'status-' + mod.status ] = mod.status.replaceAll( "-", " " ).toUpperCase();
			mod.badges[ 'type-' + mod.type ] = mod.type.replaceAll( "-", " " ).toUpperCase();
			
			if(iData.GameVersion.includes("tftft")) {
				//mod.badges[ 'requires-TFTFT' ] = "Requires TFTFT";
			}
			
			if ( mod.beta ) {
				mod.badges.beta = "BETA";
			}

			//Populate for filters
			app.data.addAuthor( mod.author );
			app.data.addMod( mod.id, mod );

			//Fill
			item.attr( "id", mod.id );
			item.attr( "class", "mod-item" + mod.extraClasses )
			item.attr( "data-name", mod.displayName.trim().toLowerCase() );
			item.attr( "data-search", mod.displayName.trim().toLowerCase() );
			mod.aliases.forEach( function( alias ) {
				if(mod.displayName.trim().toLowerCase() != alias.trim().toLowerCase()) {
				item.attr( "data-search", item.attr( "data-search") + " " + alias.trim().toLowerCase());
				}
			});
			item.attr( "data-search", item.attr( "data-search") + " " + mod.description.toLowerCase() + " "+ mod.author.toLowerCase()+ " "+ mod.author.replaceAll(" ","").toLowerCase());
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
			if ( mod.images && mod.images.length > 0 ) {
				modThumb.find( ".thumb-image img" ).attr( "src", mod.images[ 0 ] );
			} else {
				modThumb.find( ".thumb-image img" ).hide();
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
				if ( !$( this ).hasClass( "mod-viewmore" ) ) {
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
					var depID = dep.replaceAll( " ", "" ).toLowerCase();
					if ( app.data.modList[ depID ] ) {
						var depURL = app.data.modList[ depID ].downloadURL;
					} else {
						var depURL = false;
					}

					if ( depURL ) {
						var btn = $( '<li><a href="' + depURL + '" target="_blank">' + dep + '</a></li>' );
					} else {
						var btn = $( '<li><span>' + dep + '</span></li>' );
					}

					modItem.find( ".deps-list-wrapper" ).append( btn );

					btn.find( "a" ).on( "click", function( e ) {
						e.stopPropagation();
					} );
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