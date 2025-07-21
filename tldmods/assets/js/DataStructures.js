var DataStructures = function(){
	this.init();
}

DataStructures.prototype = {
	authorList: [],
	catList: [],
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

		this.authorList.sort();

	},

	addCategory: function(category){

	},

	addMod: function(modID, mod){
		this.modList[modID] = mod;
	}
}