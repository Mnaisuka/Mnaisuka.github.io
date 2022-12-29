$ = $1

function reptile() {
    var item = $('#modList>*')
    var arr = []
    for (let i = 0; i < item.length; i++) {
        var focus = $(item[i])
        var title = focus.find('a[title]')[0].childNodes[0].nodeValue
        var status = GetModsState(item[i])
        var game_ver = focus.find(":contains('TLD Version'):last").text() || "undefined"
        var load_ver = focus.find(":contains('MelonLoader'):last").text() || "undefined"
        var download = focus.find(".download-link").attr('href') || "undefined"
        var author = focus.find(".mod-author a").text() || "undefined"
        var dependence = focus.find(".deps-names").text() || "undefined"
        var detailed = focus.find(".mod-description").text() || "undefined"
        var update = focus.find(".mod-release")[0].childNodes[1].nodeValue || "undefined"
        var github = focus.find('.mod-source a').attr('href')||'none'
        var temporary = {
            'title': title,
            'status': status,
            'game_ver': game_ver,
            'load_ver': load_ver,
            'download': download,
            'author': author,
            'dependence': dependence,
            'detailed': detailed,
            'update': update,
            'github':github
        }
        $(document.querySelector("#agriculture"))
        arr.push(temporary)
    }
    return arr
    function GetModsState(item) {
        var control = {
            "0": ".mod-working.mod-updated",//正常工作
            "1": ".mod-working.mod-not-updated",//可能出错
            "2": ".mod-working-issues.mod-not-updated",//工作异常
            "3": ".mod-notworking.mod-not-updated",//无法工作
        }
        for (key in control) {
            if ($(item).is(control[key])) {
                return key
            }
        }
        return -1
    }
}
console.log(reptile());