var DataStructures = function(){
	this.init();
}

DataStructures.prototype = {
	authorList: [],
	catList: {},
	modList: {},

	init: function(){

	},

	addAuthor: function(author){
		var _this = this;

		author = author.replace("and",",");
		var authors = author.split(",");

		authors.forEach(function(authorItem){
			var clAuthor = authorItem.trim().replace(/<[^>]*>?/gm, '').toLowerCase();

			if (clAuthor && !_this.authorList.includes(clAuthor)){
				_this.authorList.push(clAuthor);
			}
		});

		_this.authorList.sort();

	},

	addCategory: function(catId,cat){
		var _this = this;
		_this.catList[catId] = cat;
	},

	addMod: function(modID, mod){
		this.modList[modID] = mod;
	}
}