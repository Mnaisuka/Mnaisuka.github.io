var DataLoader = function(){
};

DataLoader.prototype = {
	
	modList: {},

	getModlist: function(){
		//Check cache data

		this.loadSources();
	},

	loadSources: function(){
		started = performance.now();

		var _this = this;

		var file = "/thelongdark/api.json";
			$.getJSON(file, function(data) {
				 $.each(data, function (modName, modData) {
//					console.log(modData);
   					_this.modList[modName] = modData;
					 
				 });

    			/*loaded++;

    			if (loaded >= total){
    				$(_this).trigger("dataLoaded");
    			}	*/	
    		}).fail(function(req, status, error){
    			console.log(file+" couldn't be loaded.");
    			console.log(error);
    		}).done(function(){
   				$(_this).trigger("dataLoaded");
			});
			end = performance.now() - started;
			console.log("loadSources ("+end+"ms)");
	}
};